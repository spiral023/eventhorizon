from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CompanyBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: str
    address: str
    postal_code: str
    city: str
    industry: str
    coordinates: Optional[list[float]] = None


class CompanyCreate(CompanyBase):
    pass


class CompanyUpdate(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    name: Optional[str] = None
    address: Optional[str] = None
    postal_code: Optional[str] = None
    city: Optional[str] = None
    industry: Optional[str] = None
    coordinates: Optional[list[float]] = None


class Company(CompanyBase):
    id: int
    created_at: Optional[datetime] = None


class CompanyActivityTravelTime(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    company_id: int
    activity_id: UUID
    walk_minutes: Optional[int] = None
    drive_minutes: Optional[int] = None
    updated_at: Optional[datetime] = None
