"""
Admin User Delete by Phone — 백엔드 패치 파일

이 파일을 telegram-dashboard-backend/app/api/admin.py에 추가하세요.
적용: admin.py 끝에 아래 코드를 붙여넣기

필요한 import (admin.py 상단에 없으면 추가):
from app.crud import session as session_crud
"""

"""
# ===== admin.py에 추가할 엔드포인트 =====

@router.delete(
    "/users/by-phone/{phone}",
    dependencies=[Depends(require_admin)],
)
async def delete_user_by_phone(
    phone: str,
    db: AsyncSession = Depends(get_db),
):
    # 전화번호로 사용자 조회
    user = await user_crud.get_user_by_phone(db, phone)
    if user is None:
        raise HTTPException(status_code=404, detail="해당 전화번호의 사용자를 찾을 수 없습니다.")

    # 세션 삭제
    await db.execute(
        sa_text(f"DELETE FROM sessions WHERE user_id = '{user.id}'")
    )

    # Tenant 삭제
    await db.execute(
        sa_text(f"DELETE FROM tenants WHERE phone = '{phone}'")
    )

    # 사용자 삭제
    await db.delete(user)
    await db.commit()

    logger.info("admin_user_deleted_by_phone", user_id=user.id, phone=phone)
    return {"deleted": True, "user_id": user.id, "phone": phone}

# ===== 끝 =====
"""