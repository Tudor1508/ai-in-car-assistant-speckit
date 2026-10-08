from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.api.responses import SuccessEnvelope, common_error_responses, success_envelope
from src.auth.dependencies import get_db
from src.data.models.account import Account
from src.producer.dependencies import require_producer
from src.producer.schemas import ProducerReport
from src.producer.service import get_producer_report


router = APIRouter(prefix="/producer", tags=["producer"])


@router.get(
    "/report",
    response_model=SuccessEnvelope[ProducerReport],
    responses=common_error_responses(),
)
def producer_report(
    db: Session = Depends(get_db),
    producer: Account = Depends(require_producer),
):
    return success_envelope(get_producer_report(db, producer).model_dump(mode="json"))
