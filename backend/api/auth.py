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

_TWITTER_AUTH_URL = "https://twitter.com/i/oauth2/authorize"
_TWITTER_TOKEN_URL = "https://api.twitter.com/2/oauth2/token"
_TWITTER_USERINFO_URL = "https://api.twitter.com/2/users/me"

_TOKEN_MAX_AGE = 60 * 60 * 24 * 7  # 7 days
_STATE_MAX_AGE = 600  # 10 minutes

_GOOGLE_STATE_COOKIE = "google_oauth_state"
_GOOGLE_EXPECTED_EMAIL_COOKIE = "google_oauth_expected_email"
_TWITTER_STATE_COOKIE = "twitter_oauth_state"
_TWITTER_PKCE_COOKIE = "twitter_pkce_verifier"

# ---------------------------------------------------------------------------
# Minimal JWT helpers (HS256) – no external library needed
# ---------------------------------------------------------------------------

def _b64url(data: bytes) -> str:
    return urlsafe_b64encode(data).rstrip(b"=").decode()


def _b64url_decode(s: str) -> bytes:
    s += "=" * (-len(s) % 4)
    return urlsafe_b64decode(s)


def _create_jwt(payload: dict) -> str:
    header = _b64url(json.dumps({"alg": "HS256", "typ": "JWT"}).encode())
    body = _b64url(json.dumps(payload).encode())
    sig = hmac.new(settings.jwt_secret.encode(), f"{header}.{body}".encode(), hashlib.sha256).digest()
    return f"{header}.{body}.{_b64url(sig)}"


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


def _issue_session_cookie(response: Response, user: dict) -> None:
    token = _create_jwt({**user, "exp": int(time.time()) + _TOKEN_MAX_AGE})
    response.set_cookie(
        "session",
        token,
        httponly=True,
        samesite="lax",
        max_age=_TOKEN_MAX_AGE,
        secure=False,  # set True behind HTTPS in production
    )


def _build_redirect(base: str) -> str:
    return f"{settings.oauth_redirect_base}{base}"


def _clear_google_oauth_cookies(response: Response) -> None:
    response.delete_cookie(_GOOGLE_STATE_COOKIE)
    response.delete_cookie(_GOOGLE_EXPECTED_EMAIL_COOKIE)


def _clear_twitter_oauth_cookies(response: Response) -> None:
    response.delete_cookie(_TWITTER_STATE_COOKIE)
    response.delete_cookie(_TWITTER_PKCE_COOKIE)


# ---------------------------------------------------------------------------
# Google OAuth 2.0
# ---------------------------------------------------------------------------

@router.get("/google/login")
async def google_login(request: Request):
    state = secrets.token_urlsafe(32)
    params = {
        "client_id": settings.google_client_id,
        "redirect_uri": _build_redirect("/api/auth/google/callback"),
        "response_type": "code",
        "scope": "openid email profile",
        "state": state,
        "access_type": "offline",
        "prompt": "consent",
    }
    login_hint = request.query_params.get("login_hint", "")
    expected_email = request.query_params.get("expected_email", "")
    if login_hint:
        params["login_hint"] = login_hint
    url = f"{_GOOGLE_AUTH_URL}?{urllib.parse.urlencode(params)}"
    resp = RedirectResponse(url)
    resp.set_cookie(_GOOGLE_STATE_COOKIE, state, httponly=True, samesite="lax", max_age=_STATE_MAX_AGE)
    if expected_email:
        resp.set_cookie(_GOOGLE_EXPECTED_EMAIL_COOKIE, expected_email, httponly=True, samesite="lax", max_age=_STATE_MAX_AGE)
    else:
        resp.delete_cookie(_GOOGLE_EXPECTED_EMAIL_COOKIE)
    return resp


@router.get("/google/callback")
async def google_callback(request: Request, code: str = "", state: str = ""):
    saved_state = request.cookies.get(_GOOGLE_STATE_COOKIE, "")
    expected_email = request.cookies.get(_GOOGLE_EXPECTED_EMAIL_COOKIE, "")
    if not saved_state or not hmac.compare_digest(saved_state, state):
        resp = RedirectResponse("/?auth_error=invalid_state")
        _clear_google_oauth_cookies(resp)
        return resp

    if not code:
        resp = RedirectResponse("/?auth_error=missing_code")
        _clear_google_oauth_cookies(resp)
        return resp

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_resp = await client.post(_GOOGLE_TOKEN_URL, data={
                "code": code,
                "client_id": settings.google_client_id,
                "client_secret": settings.google_client_secret,
                "redirect_uri": _build_redirect("/api/auth/google/callback"),
                "grant_type": "authorization_code",
            })
            token_resp.raise_for_status()
            tokens = token_resp.json()

            user_resp = await client.get(_GOOGLE_USERINFO_URL, headers={
                "Authorization": f"Bearer {tokens['access_token']}",
            })
            user_resp.raise_for_status()
            info = user_resp.json()
    except httpx.HTTPError:
        resp = RedirectResponse("/?auth_error=token_exchange")
        _clear_google_oauth_cookies(resp)
        return resp

    provider_email = str(info.get("email", "")).strip().lower()
    is_verified = bool(info.get("email_verified", False))

    if not provider_email:
        resp = RedirectResponse("/?auth_error=email_missing")
        _clear_google_oauth_cookies(resp)
        return resp

    if not is_verified:
        resp = RedirectResponse("/?auth_error=email_not_verified")
        _clear_google_oauth_cookies(resp)
        return resp

    user = {
        "provider": "google",
        "id": info.get("sub", ""),
        "name": info.get("name", ""),
        "email": provider_email,
        "username": (provider_email.split("@")[0] if provider_email else ""),
        "picture": info.get("picture", ""),
    }

    if expected_email and user["email"].strip().lower() != expected_email.strip().lower():
        resp = RedirectResponse("/?auth_error=email_mismatch")
        _clear_google_oauth_cookies(resp)
        return resp

    resp = RedirectResponse("/?auth=success")
    _clear_google_oauth_cookies(resp)
    _issue_session_cookie(resp, user)
    return resp


# ---------------------------------------------------------------------------
# X / Twitter OAuth 2.0 (PKCE)
# ---------------------------------------------------------------------------

@router.get("/twitter/login")
async def twitter_login():
    state = secrets.token_urlsafe(32)
    code_verifier = secrets.token_urlsafe(64)
    code_challenge = _b64url(hashlib.sha256(code_verifier.encode()).digest())

    params = {
        "response_type": "code",
        "client_id": settings.twitter_client_id,
        "redirect_uri": _build_redirect("/api/auth/twitter/callback"),
        "scope": "users.read tweet.read offline.access",
        "state": state,
        "code_challenge": code_challenge,
        "code_challenge_method": "S256",
    }
    url = f"{_TWITTER_AUTH_URL}?{urllib.parse.urlencode(params)}"
    resp = RedirectResponse(url)
    resp.set_cookie(_TWITTER_STATE_COOKIE, state, httponly=True, samesite="lax", max_age=_STATE_MAX_AGE)
    resp.set_cookie(_TWITTER_PKCE_COOKIE, code_verifier, httponly=True, samesite="lax", max_age=_STATE_MAX_AGE)
    return resp


@router.get("/twitter/callback")
async def twitter_callback(request: Request, code: str = "", state: str = ""):
    saved_state = request.cookies.get(_TWITTER_STATE_COOKIE, "")
    code_verifier = request.cookies.get(_TWITTER_PKCE_COOKIE, "")

    if not saved_state or not hmac.compare_digest(saved_state, state) or not code_verifier:
        resp = RedirectResponse("/?auth_error=invalid_state")
        _clear_twitter_oauth_cookies(resp)
        return resp

    if not code:
        resp = RedirectResponse("/?auth_error=missing_code")
        _clear_twitter_oauth_cookies(resp)
        return resp

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            token_resp = await client.post(
                _TWITTER_TOKEN_URL,
                data={
                    "code": code,
                    "grant_type": "authorization_code",
                    "client_id": settings.twitter_client_id,
                    "redirect_uri": _build_redirect("/api/auth/twitter/callback"),
                    "code_verifier": code_verifier,
                },
                auth=(settings.twitter_client_id, settings.twitter_client_secret),
            )
            token_resp.raise_for_status()
            tokens = token_resp.json()

            user_resp = await client.get(
                _TWITTER_USERINFO_URL,
                params={"user.fields": "profile_image_url,name,username"},
                headers={"Authorization": f"Bearer {tokens['access_token']}"},
            )
            user_resp.raise_for_status()
            info = user_resp.json().get("data", {})
    except httpx.HTTPError:
        resp = RedirectResponse("/?auth_error=token_exchange")
        _clear_twitter_oauth_cookies(resp)
        return resp

    user = {
        "provider": "twitter",
        "id": info.get("id", ""),
        "name": info.get("name", "") or info.get("username", ""),
        "email": "",
        "username": info.get("username", ""),
        "picture": info.get("profile_image_url", ""),
    }
    resp = RedirectResponse("/?auth=success")
    _clear_twitter_oauth_cookies(resp)
    _issue_session_cookie(resp, user)
    return resp


# ---------------------------------------------------------------------------
# Session endpoints (used by the frontend)
# ---------------------------------------------------------------------------

@router.get("/me")
async def get_me(request: Request):
    token = request.cookies.get("session", "")
    user = _verify_jwt(token) if token else None
    if not user:
        return JSONResponse({"authenticated": False}, status_code=401)
    return JSONResponse({
        "authenticated": True,
        "provider": user.get("provider", ""),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "username": user.get("username", ""),
        "picture": user.get("picture", ""),
    })


@router.post("/logout")
async def logout():
    resp = JSONResponse({"ok": True})
    resp.delete_cookie("session")
    return resp
