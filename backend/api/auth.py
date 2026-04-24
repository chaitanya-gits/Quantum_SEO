from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
import urllib.parse
from base64 import urlsafe_b64decode, urlsafe_b64encode

import httpx
from fastapi import APIRouter, Request, Response
from fastapi.responses import JSONResponse, RedirectResponse

from backend.config import settings

router = APIRouter(prefix="/auth")

_GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
_GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
_GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"

_TOKEN_MAX_AGE = 60 * 60 * 24 * 7
_STATE_MAX_AGE = 600

_GOOGLE_STATE_COOKIE = "google_oauth_state"
_GOOGLE_EXPECTED_EMAIL_COOKIE = "google_oauth_expected_email"

# Per-account session cookie prefix.  Cookie name = _ACCT_PREFIX + md5(email).
_ACCT_PREFIX = "qsession_"


def _b64url(data: bytes) -> str:
    return urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(value: str) -> bytes:
    value += "=" * (-len(value) % 4)
    return urlsafe_b64decode(value)


def _create_jwt(payload: dict) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64url(json.dumps(payload).encode())
    signature = hmac.new(
        settings.jwt_secret.encode(),
        f"{header}.{body}".encode(),
        hashlib.sha256,
    ).digest()
    return f"{header}.{body}.{_b64url(signature)}"


def _verify_jwt(token: str) -> dict | None:
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None
        expected_sig = hmac.new(
            settings.jwt_secret.encode(),
            f"{parts[0]}.{parts[1]}".encode(),
            hashlib.sha256,
        ).digest()
        actual_sig = _b64url_decode(parts[2])
        if not hmac.compare_digest(expected_sig, actual_sig):
            return None
        payload = json.loads(_b64url_decode(parts[1]))
        if payload.get("exp", 0) < time.time():
            return None
        return payload
    except Exception:
        return None


def _email_cookie_name(email: str) -> str:
    """Return a per-account cookie name derived from the email address."""
    digest = hashlib.md5(email.strip().lower().encode()).hexdigest()[:12]
    return f"{_ACCT_PREFIX}{digest}"


def _issue_session_cookie(response: Response, user: dict) -> None:
    token = _create_jwt({**user, "exp": int(time.time()) + _TOKEN_MAX_AGE})
    # Set the active session cookie.
    response.set_cookie(
        "session",
        token,
        httponly=True,
        samesite="lax",
        max_age=_TOKEN_MAX_AGE,
        secure=False,
    )
    # Also store a per-account cookie so we can switch back to this account
    # without going through Google OAuth again.
    email = user.get("email", "")
    if email:
        response.set_cookie(
            _email_cookie_name(email),
            token,
            httponly=True,
            samesite="lax",
            max_age=_TOKEN_MAX_AGE,
            secure=False,
        )


def _build_redirect(path: str) -> str:
    base = settings.oauth_redirect_base.rstrip("/")
    return f"{base}{path}"


def _clear_google_oauth_cookies(response: Response) -> None:
    response.delete_cookie(_GOOGLE_STATE_COOKIE)
    response.delete_cookie(_GOOGLE_EXPECTED_EMAIL_COOKIE)


# ── Account switch (local, no Google redirect) ────────────────────────────────
@router.post("/switch")
async def local_switch(request: Request):
    """Switch to a previously-authenticated account using stored session cookies.

    No Google redirect needed — we just swap the active session cookie.
    """
    try:
        body = await request.json()
    except Exception:
        return JSONResponse({"ok": False, "error": "invalid_body"}, status_code=400)

    target_email = str(body.get("email", "")).strip().lower()
    if not target_email:
        return JSONResponse({"ok": False, "error": "missing_email"}, status_code=400)

    # Look up the per-account cookie.
    cookie_name = _email_cookie_name(target_email)
    stored_token = request.cookies.get(cookie_name, "")
    if not stored_token:
        return JSONResponse({"ok": False, "error": "no_stored_session"}, status_code=404)

    # Verify the token is still valid.
    user = _verify_jwt(stored_token)
    if not user:
        # Token expired — clear the stale per-account cookie.
        response = JSONResponse({"ok": False, "error": "session_expired"}, status_code=401)
        response.delete_cookie(cookie_name)
        return response

    # Make this the active session.
    response = JSONResponse({
        "ok": True,
        "user": {
            "authenticated": True,
            "provider": user.get("provider", ""),
            "name": user.get("name", ""),
            "email": user.get("email", ""),
            "username": user.get("username", ""),
            "picture": user.get("picture", ""),
        },
    })
    response.set_cookie(
        "session",
        stored_token,
        httponly=True,
        samesite="lax",
        max_age=_TOKEN_MAX_AGE,
        secure=False,
    )
    return response


# ── Google OAuth: first-time login ─────────────────────────────────────────────
@router.get("/google/login")
async def google_login(request: Request):
    if not settings.google_client_id or not settings.google_client_secret:
        return JSONResponse({"detail": "Google OAuth is not configured."}, status_code=503)

    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": _build_redirect("/api/auth/google/callback"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "select_account",
    }
    login_hint = request.query_params.get("login_hint", "")
    expected_email = request.query_params.get("expected_email", "")
    if login_hint:
        params["login_hint"] = login_hint

    response = RedirectResponse(f"{_GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}")
    response.set_cookie(_GOOGLE_STATE_COOKIE, state, httponly=True, samesite="lax", max_age=_STATE_MAX_AGE)
    if expected_email:
        response.set_cookie(
            _GOOGLE_EXPECTED_EMAIL_COOKIE,
            expected_email,
            httponly=True,
            samesite="lax",
            max_age=_STATE_MAX_AGE,
        )
    else:
        response.delete_cookie(_GOOGLE_EXPECTED_EMAIL_COOKIE)
    return response


@router.get("/google/callback")
async def google_callback(request: Request, code: str = "", state: str = "", error: str = ""):
    saved_state = request.cookies.get(_GOOGLE_STATE_COOKIE, "")
    expected_email = request.cookies.get(_GOOGLE_EXPECTED_EMAIL_COOKIE, "")

    # Handle Google error responses (e.g., prompt=none returning interaction_required).
    if error:
        response = RedirectResponse(f"/?auth_error={urllib.parse.quote(error)}")
        _clear_google_oauth_cookies(response)
        return response

    if not saved_state or not hmac.compare_digest(saved_state, state):
        response = RedirectResponse("/?auth_error=invalid_state")
        _clear_google_oauth_cookies(response)
        return response

    if not code:
        response = RedirectResponse("/?auth_error=missing_code")
        _clear_google_oauth_cookies(response)
        return response

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_response = await client.post(
                _GOOGLE_TOKEN_URL,
                data={
                    "code": code,
                    "client_id": settings.google_client_id,
                    "client_secret": settings.google_client_secret,
                    "redirect_uri": _build_redirect("/api/auth/google/callback"),
                    "grant_type": "authorization_code",
                },
            )
            token_response.raise_for_status()
            token_payload = token_response.json()

            user_response = await client.get(
                _GOOGLE_USERINFO_URL,
                headers={"Authorization": f"Bearer {token_payload['access_token']}"},
            )
            user_response.raise_for_status()
            info = user_response.json()
    except httpx.HTTPError:
        response = RedirectResponse("/?auth_error=token_exchange")
        _clear_google_oauth_cookies(response)
        return response

    provider_email = str(info.get("email", "")).strip().lower()
    is_verified = bool(info.get("email_verified", False))
    if not provider_email or not is_verified:
        response = RedirectResponse("/?auth_error=email_invalid")
        _clear_google_oauth_cookies(response)
        return response

    if expected_email and provider_email != expected_email.strip().lower():
        response = RedirectResponse("/?auth_error=email_mismatch")
        _clear_google_oauth_cookies(response)
        return response

    user = {
        "provider": "google",
        "id": info.get("sub", ""),
        "name": info.get("name", ""),
        "email": provider_email,
        "username": provider_email.split("@")[0] if provider_email else "",
        "picture": info.get("picture", ""),
    }

    response = RedirectResponse("/?auth=success")
    _clear_google_oauth_cookies(response)
    _issue_session_cookie(response, user)
    return response


@router.get("/me")
async def get_me(request: Request):
    token = request.cookies.get("session", "")
    user = _verify_jwt(token) if token else None
    if not user:
        return JSONResponse({"authenticated": False}, status_code=401)

    user_data = {
        "authenticated": True,
        "provider": user.get("provider", ""),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "username": user.get("username", ""),
        "picture": user.get("picture", ""),
    }

    response = JSONResponse(user_data)

    # Backfill per-account cookie if missing (for accounts logged in before
    # multi-session support was added).
    email = user.get("email", "")
    if email:
        cookie_name = _email_cookie_name(email)
        if not request.cookies.get(cookie_name):
            response.set_cookie(
                cookie_name,
                token,
                httponly=True,
                samesite="lax",
                max_age=_TOKEN_MAX_AGE,
                secure=False,
            )

    return response


@router.post("/logout")
async def logout(request: Request):
    """Sign out the active account. Per-account cookies for other accounts are kept."""
    # Find the active user's email so we can remove that specific per-account cookie.
    active_token = request.cookies.get("session", "")
    active_user = _verify_jwt(active_token) if active_token else None

    response = JSONResponse({"ok": True})
    response.delete_cookie("session")

    # Also remove the per-account cookie for the signed-out user.
    if active_user:
        email = active_user.get("email", "")
        if email:
            response.delete_cookie(_email_cookie_name(email))

    return response
