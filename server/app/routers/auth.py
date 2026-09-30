"""
Signup, login and "who am I".

There is no logout endpoint: a JWT is stored only in the browser, so logging
out means the browser deletes it. (A server-side token blocklist would let
you force-logout a stolen token; that's a possible next step.)
"""

from fastapi import APIRouter, HTTPException, status
from sqlmodel import select

from app.deps import CurrentUser, SessionDep
from app.models import User
from app.schemas import LoginIn, SignupIn, TokenOut, UserOut
from app.security import create_access_token, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["auth"])


def _token_response(user: User) -> TokenOut:
    return TokenOut(
        access_token=create_access_token(user.id),
        user=UserOut(id=user.id, name=user.name, email=user.email),
    )


@router.post("/signup", response_model=TokenOut, status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, session: SessionDep) -> TokenOut:
    # SignupIn has already checked: name not blank, valid @stonybrook.edu email,
    # password at least 8 characters. Invalid input never reaches this line.
    existing = session.exec(select(User).where(User.email == body.email)).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "An account with this email already exists")

    user = User(name=body.name, email=body.email, password_hash=hash_password(body.password))
    session.add(user)
    session.commit()
    session.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, session: SessionDep) -> TokenOut:
    user = session.exec(select(User).where(User.email == body.email.lower())).first()
    # Same error whether the email or the password is wrong, so attackers
    # can't use this endpoint to find out which emails have accounts.
    if user is None or not verify_password(body.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def me(user: CurrentUser) -> UserOut:
    return UserOut(id=user.id, name=user.name, email=user.email)
