from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.api.deps import get_current_user
from app.db.session import get_db
from app.models.domain import Company, CompanyActivityTravelTime, User
from app.schemas.company import Company as CompanySchema
from app.schemas.company import CompanyActivityTravelTime as CompanyActivityTravelTimeSchema
from app.schemas.company import CompanyCreate

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=List[CompanySchema])
async def list_companies(
    skip: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).offset(skip).limit(limit).order_by(Company.name))
    return result.scalars().all()


@router.get("/{company_id}", response_model=CompanySchema)
async def get_company(
    company_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")
    return company


@router.post("", response_model=CompanySchema)
async def create_company(
    company_in: CompanyCreate,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_current_user),
):
    company = Company(
        name=company_in.name,
        address=company_in.address,
        postal_code=company_in.postal_code,
        city=company_in.city,
        industry=company_in.industry,
        coordinates=company_in.coordinates,
    )
    db.add(company)
    await db.commit()
    await db.refresh(company)
    return company


@router.get("/{company_id}/travel-times", response_model=List[CompanyActivityTravelTimeSchema])
async def get_company_travel_times(
    company_id: int,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(CompanyActivityTravelTime).where(CompanyActivityTravelTime.company_id == company_id)
    )
    return result.scalars().all()
