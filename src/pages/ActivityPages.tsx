import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  claimMissionReward,
  createVisitReview,
  deleteReview,
  getMyCoupon,
  getMyCoupons,
  getMyCouponUsageHistory,
  getMyMissionParticipation,
  getMyMissionParticipations,
  getMyStampbook,
  getMyStampbookEarnings,
  getMyStampbooks,
  getPublicMission,
  getPublicRegionMissions,
  issueCoupon,
  participateInMission,
  updateReview,
  type CouponDetail,
  type CouponSummary,
  type CouponUsageHistory,
  type MissionParticipationDetail,
  type MissionParticipationSummary,
  type PublicMission,
  type PublicMissionDetail,
  type ReviewMutationResponse,
  type StampbookDetail,
  type StampbookEarnings,
  type StampbookSummary,
} from "../api/activities";
import { ApiError, isAbortError } from "../api/client";
import { getMyReservation, type ReservationDetail } from "../api/reservations";
import { Breadcrumbs, InfoRow, Notice, PageHeader, StatusPill } from "../components/PageElements";
import { useAppState } from "../components/AppLayout";

const dateFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  timeZone: "Asia/Seoul",
});
const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "Asia/Seoul",
});
const currencyFormatter = new Intl.NumberFormat("ko-KR");

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function formatRange(startsAt: string, endsAt: string) {
  return `${dateTimeFormatter.format(new Date(startsAt))}–${dateTimeFormatter.format(new Date(endsAt))}`;
}

function progressStatus(status: string) {
  const labels: Record<string, string> = {
    IN_PROGRESS: "진행 중",
    COMPLETED: "완료",
    REWARDED: "보상 수령",
    NOT_STARTED: "시작 전",
    ENDED_INCOMPLETE: "종료",
  };
  return labels[status] ?? status;
}

function couponSourceLabel(sourceType: string) {
  const labels: Record<string, string> = {
    VISIT: "방문",
    STAMPBOOK_COMPLETION: "스탬프북 완료",
    MISSION_REWARD: "미션 보상",
  };
  return labels[sourceType] ?? sourceType;
}

function couponStatusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "사용 가능",
    USED: "사용 완료",
    EXPIRED: "기간 만료",
  };
  return labels[status] ?? status;
}

export function ReviewPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const visitId = params.get("visitId");
  const reservationId = params.get("reservationId");
  const [reservation, setReservation] = useState<ReservationDetail | null>(null);
  const [rating, setRating] = useState(0);
  const [review, setReview] = useState("");
  const [savedReview, setSavedReview] = useState<ReviewMutationResponse | null>(null);
  const [loading, setLoading] = useState(Boolean(reservationId));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reservationId) return;
    const controller = new AbortController();
    getMyReservation(reservationId, controller.signal)
      .then((result) => {
        setReservation(result);
        if (
          result.review?.status === "PUBLISHED" &&
          result.review.rating !== null &&
          result.review.reviewText !== null
        ) {
          setSavedReview({
            reviewId: result.review.reviewId,
            rating: result.review.rating,
            reviewText: result.review.reviewText,
            createdAt: result.review.createdAt,
            updatedAt: result.review.updatedAt,
          });
          setRating(result.review.rating);
          setReview(result.review.reviewText);
        } else if (result.review?.status === "DELETED") {
          setError("삭제한 후기는 다시 작성하거나 수정할 수 없습니다.");
        }
      })
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return;
        setError(errorMessage(requestError, "방문 정보를 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [reservationId]);

  const save = async () => {
    if (!visitId) {
      setError("후기를 작성할 방문 기록을 찾을 수 없습니다.");
      return;
    }
    if (reservation?.review?.status === "DELETED") {
      setError("삭제한 후기는 다시 작성하거나 수정할 수 없습니다.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = savedReview
        ? await updateReview(savedReview.reviewId, rating, review)
        : await createVisitReview(visitId, rating, review);
      if (savedReview) {
        navigate("/reservations?tab=past", { replace: true });
        return;
      }
      setSavedReview(result);
      setRating(result.rating);
      setReview(result.reviewText);
    } catch (requestError) {
      if (
        !savedReview &&
        requestError instanceof ApiError &&
        requestError.status === 400 &&
        requestError.code === "INVALID_INPUT"
      ) {
        setError(
          "이미 작성했거나 삭제한 후기가 있는 방문일 수 있습니다. 현재 화면에서는 기존 후기를 수정할 수 없습니다.",
        );
      } else {
        setError(errorMessage(requestError, "후기를 저장하지 못했습니다."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async () => {
    if (!savedReview || !window.confirm("작성한 후기를 삭제할까요?")) return;
    setSubmitting(true);
    setError(null);
    try {
      await deleteReview(savedReview.reviewId);
      navigate("/reservations?tab=past");
    } catch (requestError) {
      setError(errorMessage(requestError, "후기를 삭제하지 못했습니다."));
      setSubmitting(false);
    }
  };

  if (loading) {
    return <section className="visitor-page-state">방문 정보를 불러오는 중입니다.</section>;
  }

  return (
    <section className="page-container narrow-page">
      <PageHeader
        title="방문 후기를 남겨주세요"
        description="체크인이 완료된 방문에 대해 한 번 작성할 수 있어요."
      >
        <Breadcrumbs
          items={[
            { label: "홈", to: "/" },
            { label: "내 예약", to: "/reservations" },
            { label: reservation?.content.title ?? "방문 콘텐츠" },
            { label: savedReview ? "후기 수정" : "후기 작성" },
          ]}
        />
      </PageHeader>
      {!visitId && (
        <Notice tone="red">체크인 완료 예약의 ‘후기 작성’ 버튼으로 접근해 주세요.</Notice>
      )}
      <div className="confirmation-grid review-layout">
        <section>
          <h2>후기 내용</h2>
          <label className="field-label">
            만족도 <em>필수</em>
          </label>
          <div className="stars" aria-label="만족도">
            {[1, 2, 3, 4, 5].map((star) => (
              <button key={star} onClick={() => setRating(star)} aria-label={`${star}점`}>
                {star <= rating ? "★" : "☆"}
              </button>
            ))}
          </div>
          <p className="field-help">별점을 선택해 주세요.</p>
          <label className="field-label" htmlFor="review">
            후기 <em>필수</em>
          </label>
          <textarea
            id="review"
            value={review}
            onChange={(event) => setReview(event.target.value)}
            maxLength={2000}
            placeholder="방문하며 좋았던 점이나 다른 방문자에게 도움이 될 내용을 남겨 주세요."
          />
          <span className="character-count">{review.length} / 2,000</span>
          {savedReview && (
            <p className="green-text">후기가 저장되었습니다. 수정하거나 삭제할 수 있습니다.</p>
          )}
          {error && <p className="form-error">{error}</p>}
          <button
            className="button-primary review-submit"
            disabled={
              !visitId ||
              !rating ||
              !review.trim() ||
              submitting ||
              reservation?.review?.status === "DELETED"
            }
            onClick={save}
          >
            {submitting ? "저장 중…" : savedReview ? "후기 수정하기" : "후기 등록하기"}
          </button>
          {savedReview && (
            <button className="button-danger review-submit" disabled={submitting} onClick={remove}>
              후기 삭제하기
            </button>
          )}
        </section>
        <section className="visited-content">
          <h2>방문한 콘텐츠</h2>
          <article>
            <StatusPill>체크인 완료</StatusPill>
            <h3>
              {reservation ? (
                <Link
                  className="content-title-link"
                  to={`/events/${reservation.content.contentId}`}
                >
                  {reservation.content.title}
                </Link>
              ) : (
                "방문 콘텐츠"
              )}
            </h3>
            {reservation && (
              <p>
                {formatRange(reservation.session.startsAt, reservation.session.endsAt)}
                <br />
                {reservation.content.locationText}
              </p>
            )}
          </article>
          <h3>작성 안내</h3>
          <ul>
            <li>후기는 콘텐츠 상세에 ‘인증 방문자’로 공개됩니다.</li>
            <li>방문당 한 개의 후기만 작성할 수 있습니다.</li>
            <li>등록 후 30일 동안 내용을 수정할 수 있습니다.</li>
          </ul>
        </section>
      </div>
    </section>
  );
}

export function CouponsPage() {
  const [coupons, setCoupons] = useState<CouponSummary[]>([]);
  const [openCouponId, setOpenCouponId] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, CouponDetail>>({});
  const [histories, setHistories] = useState<Record<string, CouponUsageHistory>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getMyCoupons(undefined, controller.signal)
      .then((result) => setCoupons(result.coupons))
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return;
        setError(errorMessage(requestError, "쿠폰을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const toggleHistory = async (couponId: string) => {
    if (openCouponId === couponId) {
      setOpenCouponId(null);
      return;
    }
    setOpenCouponId(couponId);
    if (details[couponId] && histories[couponId]) return;
    try {
      const [detail, history] = await Promise.all([
        getMyCoupon(couponId),
        getMyCouponUsageHistory(couponId),
      ]);
      setDetails((current) => ({ ...current, [couponId]: detail }));
      setHistories((current) => ({ ...current, [couponId]: history }));
    } catch (requestError) {
      setError(errorMessage(requestError, "쿠폰 상세를 불러오지 못했습니다."));
    }
  };

  const availableCount = coupons.filter((coupon) => coupon.status === "AVAILABLE").length;
  return (
    <section className="page-container narrow-page">
      <PageHeader
        title="쿠폰 지갑"
        description="보유한 쿠폰과 사용 내역을 확인하세요."
        action={<b className="green-text">사용 가능 쿠폰 {availableCount}장</b>}
      >
        <Breadcrumbs items={[{ label: "홈", to: "/" }, { label: "쿠폰 지갑" }]} />
      </PageHeader>
      <h2 className="content-title">보유 쿠폰</h2>
      {loading && <p>쿠폰을 불러오는 중입니다.</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && coupons.length === 0 && (
        <p className="visitor-page-state">보유한 쿠폰이 없습니다.</p>
      )}
      <div className="coupon-list">
        {coupons.map((coupon) => (
          <Coupon
            key={coupon.couponId}
            coupon={coupon}
            detail={details[coupon.couponId]}
            history={histories[coupon.couponId]}
            isHistoryOpen={openCouponId === coupon.couponId}
            onToggleHistory={() => toggleHistory(coupon.couponId)}
          />
        ))}
      </div>
      <p className="coupon-note">
        쿠폰 적용 가능 여부와 최종 할인 금액은 예약 결제 단계에서 현재 회차와 결제 금액을 기준으로
        다시 확인됩니다.
      </p>
    </section>
  );
}

function Coupon({
  coupon,
  detail,
  history,
  isHistoryOpen,
  onToggleHistory,
}: {
  coupon: CouponSummary;
  detail?: CouponDetail;
  history?: CouponUsageHistory;
  isHistoryOpen: boolean;
  onToggleHistory: () => void;
}) {
  return (
    <article className="coupon">
      <div>
        <StatusPill tone={coupon.status === "AVAILABLE" ? "green" : "gray"}>
          {couponStatusLabel(coupon.status)}
        </StatusPill>
        <b>
          {currencyFormatter.format(coupon.discountAmount)}
          <small>원 할인</small>
        </b>
      </div>
      <div>
        <p>
          {coupon.policyName}
          <br />
          {currencyFormatter.format(coupon.minimumPaymentAmount)}원 이상 결제 시
        </p>
        <small>{couponSourceLabel(coupon.issueSourceType)} 발급</small>
        <button
          className="coupon-history-toggle"
          type="button"
          aria-expanded={isHistoryOpen}
          aria-controls={`coupon-history-${coupon.couponId}`}
          onClick={onToggleHistory}
        >
          상세·사용 이력 {isHistoryOpen ? "접기" : "보기"}
        </button>
      </div>
      <time>
        {dateFormatter.format(new Date(coupon.expiresAt))}까지
        <small>발급일 {dateFormatter.format(new Date(coupon.issuedAt))}</small>
      </time>
      {isHistoryOpen && (
        <div className="coupon-usage-history" id={`coupon-history-${coupon.couponId}`}>
          <h3>사용 · 복구 이력</h3>
          {detail && (
            <p>
              정책 상태 {detail.policy.status} · 발급 후 {detail.policy.validDaysAfterIssue}일 유효
            </p>
          )}
          {history ? (
            history.usageHistory.length > 0 ? (
              history.usageHistory.map((item) => (
                <HistoryItem
                  key={item.couponRedemptionId}
                  symbol={item.status === "CONFIRMED" ? "✓" : "↶"}
                  title={`${currencyFormatter.format(item.discountAmount)}원 할인 · ${item.status}`}
                  sub={`예약 ID ${item.reservationId}`}
                  date={dateTimeFormatter.format(new Date(item.reversedAt ?? item.confirmedAt))}
                />
              ))
            ) : (
              <p>사용·복구 이력이 없습니다.</p>
            )
          ) : (
            <p>사용 이력을 불러오는 중입니다.</p>
          )}
        </div>
      )}
    </article>
  );
}

function HistoryItem({
  symbol,
  title,
  sub,
  date,
}: {
  symbol: string;
  title: string;
  sub: string;
  date: string;
}) {
  return (
    <article className="history-item">
      <span>{symbol}</span>
      <div>
        <b>{title}</b>
        <small>{sub}</small>
      </div>
      <time>{date}</time>
    </article>
  );
}

export function MissionsPage() {
  const { loggedIn, region, regionId, openRegionDialog } = useAppState();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");
  const [missions, setMissions] = useState<PublicMission[]>([]);
  const [missionDetails, setMissionDetails] = useState<Record<string, PublicMissionDetail>>({});
  const [participations, setParticipations] = useState<MissionParticipationSummary[]>([]);
  const [participationDetails, setParticipationDetails] = useState<
    Record<string, MissionParticipationDetail>
  >({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    if (!regionId) return;
    const controller = new AbortController();
    setLoading(true);
    setError(null);
    const load = async () => {
      const publicResult = await getPublicRegionMissions(regionId, {
        size: 100,
        signal: controller.signal,
      });
      const details = await Promise.all(
        publicResult.content.map((mission) =>
          getPublicMission(mission.missionId, controller.signal),
        ),
      );
      setMissions(publicResult.content);
      setMissionDetails(Object.fromEntries(details.map((detail) => [detail.missionId, detail])));

      if (loggedIn) {
        const myResult = await getMyMissionParticipations({
          size: 100,
          signal: controller.signal,
        });
        setParticipations(myResult.content);
        const myDetails = await Promise.all(
          myResult.content.map((item) =>
            getMyMissionParticipation(item.participationId, controller.signal),
          ),
        );
        setParticipationDetails(
          Object.fromEntries(myDetails.map((detail) => [detail.participationId, detail])),
        );
      } else {
        setParticipations([]);
        setParticipationDetails({});
      }
    };
    load()
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return;
        setError(errorMessage(requestError, "지역 미션을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [loggedIn, regionId, version]);

  const participationByMission = useMemo(
    () => Object.fromEntries(participations.map((item) => [item.missionId, item])),
    [participations],
  );
  const visibleMissions = missions.filter((mission) => {
    const status = participationByMission[mission.missionId]?.status;
    return activeTab === "completed" ? status === "COMPLETED" : status !== "COMPLETED";
  });
  const completedCount = missions.filter(
    (mission) => participationByMission[mission.missionId]?.status === "COMPLETED",
  ).length;

  const join = async (missionId: string) => {
    if (!loggedIn) {
      navigate("/login");
      return;
    }
    try {
      await participateInMission(missionId);
      setVersion((value) => value + 1);
    } catch (requestError) {
      setError(errorMessage(requestError, "미션에 참여하지 못했습니다."));
    }
  };

  const claim = async (participationId: string) => {
    try {
      await claimMissionReward(participationId);
      setVersion((value) => value + 1);
    } catch (requestError) {
      setError(errorMessage(requestError, "미션 보상을 수령하지 못했습니다."));
    }
  };

  return (
    <section className="page-container narrow-page">
      <PageHeader
        title="내 지역 미션"
        description="참여할 미션과 진행도, 완료 보상을 확인하세요."
        action={
          <button className="region-button" onClick={openRegionDialog}>
            ✦ {region} · 지역 변경
          </button>
        }
      >
        <Breadcrumbs items={[{ label: "홈", to: "/" }, { label: "내 지역 미션" }]} />
      </PageHeader>
      <div className="tab-row">
        <button
          className={activeTab === "active" ? "active" : ""}
          onClick={() => setActiveTab("active")}
        >
          진행·참여 가능 <b>{missions.length - completedCount}</b>
        </button>
        <button
          className={activeTab === "completed" ? "active" : ""}
          onClick={() => setActiveTab("completed")}
        >
          완료 <b>{completedCount}</b>
        </button>
      </div>
      {loading && <p>미션을 불러오는 중입니다.</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && visibleMissions.length === 0 && (
        <p className="visitor-page-state">해당하는 미션이 없습니다.</p>
      )}
      <div className="mission-list">
        {visibleMissions.map((mission) => {
          const participation = participationByMission[mission.missionId];
          return (
            <Mission
              key={mission.missionId}
              mission={mission}
              detail={missionDetails[mission.missionId]}
              participation={participation}
              participationDetail={
                participation ? participationDetails[participation.participationId] : undefined
              }
              onJoin={() => join(mission.missionId)}
              onClaim={participation ? () => claim(participation.participationId) : undefined}
            />
          );
        })}
      </div>
      <Notice>안내&nbsp; 완료 보상은 미션이 종료되기 전까지만 수령할 수 있습니다.</Notice>
    </section>
  );
}

function Mission({
  mission,
  detail,
  participation,
  participationDetail,
  onJoin,
  onClaim,
}: {
  mission: PublicMission;
  detail?: PublicMissionDetail;
  participation?: MissionParticipationSummary;
  participationDetail?: MissionParticipationDetail;
  onJoin: () => void;
  onClaim?: () => void;
}) {
  const requiredCount =
    participation?.requiredCount ?? mission.requiredVisitCount ?? mission.targetContentCount;
  const progressCount = participation?.progressCount ?? 0;
  const targetTitles = detail?.targetContents.map((item) => item.title).join(" · ");
  const missionDescription = detail
    ? targetTitles || `지역 내 콘텐츠를 ${requiredCount}회 방문해 보세요.`
    : "미션 상세를 불러오는 중입니다.";
  return (
    <article className="mission-card">
      <div className="mission-count">
        <small>{mission.conditionType}</small>
        <b>
          {progressCount} / {requiredCount}
        </b>
        <span>콘텐츠 방문</span>
      </div>
      <div>
        <StatusPill tone={participation ? "green" : "gray"}>
          {participation ? progressStatus(participation.status) : "참여 가능"}
        </StatusPill>
        <h2>{mission.title}</h2>
        <p>{missionDescription}</p>
        {participation && (
          <small>참여일 {dateFormatter.format(new Date(participation.joinedAt))}</small>
        )}
        {participationDetail?.progresses.length ? (
          <small> · 최근 적립 {participationDetail.progresses.at(-1)?.contentTitle}</small>
        ) : null}
        <b className="mission-end">{dateFormatter.format(new Date(mission.endsAt))} 종료</b>
      </div>
      {!participation ? (
        <button className="button-outline" onClick={onJoin}>
          참여하기
        </button>
      ) : participation.status === "COMPLETED" && !participation.rewardClaimed ? (
        <button className="button-primary" onClick={onClaim}>
          보상 수령
        </button>
      ) : (
        <Link className="button-outline" to="/stampbook">
          스탬프북 보기
        </Link>
      )}
    </article>
  );
}

export function StampbookPage() {
  const { region, openRegionDialog } = useAppState();
  const [books, setBooks] = useState<StampbookSummary[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [detail, setDetail] = useState<StampbookDetail | null>(null);
  const [earnings, setEarnings] = useState<StampbookEarnings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rewardMessage, setRewardMessage] = useState<string | null>(null);
  const [issuingReward, setIssuingReward] = useState(false);
  const [issuedRewards, setIssuedRewards] = useState<Record<string, string>>({});

  useEffect(() => {
    const controller = new AbortController();
    getMyStampbooks(controller.signal)
      .then((result) => {
        setBooks(result.stampbooks);
        setSelectedId((current) => current || result.stampbooks[0]?.stampbookId || "");
      })
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return;
        setError(errorMessage(requestError, "스탬프북을 불러오지 못했습니다."));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const loadIssuedRewards = async () => {
      const result = await getMyCoupons(undefined, controller.signal);
      const rewardCoupons = result.coupons.filter(
        (coupon) => coupon.issueSourceType === "STAMPBOOK_COMPLETION",
      );
      const rewardDetails = await Promise.all(
        rewardCoupons.map((coupon) => getMyCoupon(coupon.couponId, controller.signal)),
      );
      if (controller.signal.aborted) return;
      setIssuedRewards(
        Object.fromEntries(
          rewardDetails.map((coupon) => [coupon.coupon.sourceId, coupon.coupon.couponId]),
        ),
      );
    };
    loadIssuedRewards().catch((requestError) => {
      if (isAbortError(requestError, controller.signal)) return;
      setError(errorMessage(requestError, "완료 보상 발급 상태를 불러오지 못했습니다."));
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    setRewardMessage(null);
    if (!selectedId) {
      setDetail(null);
      setEarnings(null);
      return;
    }
    const controller = new AbortController();
    Promise.all([
      getMyStampbook(selectedId, controller.signal),
      getMyStampbookEarnings(selectedId, controller.signal),
    ])
      .then(([nextDetail, nextEarnings]) => {
        setDetail(nextDetail);
        setEarnings(nextEarnings);
      })
      .catch((requestError) => {
        if (isAbortError(requestError, controller.signal)) return;
        setError(errorMessage(requestError, "스탬프북 상세를 불러오지 못했습니다."));
      });
    return () => controller.abort();
  }, [selectedId]);

  const issueCompletionReward = async () => {
    const reward = detail?.progress.completionReward;
    if (!reward) return;
    setIssuingReward(true);
    setError(null);
    try {
      const coupon = await issueCoupon(
        reward.couponPolicyId,
        "STAMPBOOK_COMPLETION",
        reward.stampbookRewardGrantId,
      );
      setIssuedRewards((current) => ({
        ...current,
        [reward.stampbookRewardGrantId]: coupon.couponId,
      }));
      setRewardMessage(
        coupon.duplicate ? "이미 발급된 완료 보상 쿠폰입니다." : "완료 보상 쿠폰을 발급했습니다.",
      );
    } catch (requestError) {
      setError(errorMessage(requestError, "완료 보상 쿠폰을 발급하지 못했습니다."));
    } finally {
      setIssuingReward(false);
    }
  };

  return (
    <section className="page-container narrow-page">
      <PageHeader
        title="내 스탬프북"
        description="방문으로 적립한 스탬프와 대상 콘텐츠를 확인하세요."
        action={
          <button className="region-button" onClick={openRegionDialog}>
            ✦ {region} · 지역 변경
          </button>
        }
      >
        <Breadcrumbs items={[{ label: "홈", to: "/" }, { label: "내 스탬프북" }]} />
      </PageHeader>
      {loading && <p>스탬프북을 불러오는 중입니다.</p>}
      {error && <p className="form-error">{error}</p>}
      {!loading && books.length === 0 && (
        <p className="visitor-page-state">내 스탬프북이 없습니다.</p>
      )}
      {books.length > 0 && (
        <div className="stamp-layout">
          <aside>
            <h3>내 스탬프북 {books.length}개</h3>
            {books.map((book) => (
              <button
                key={book.stampbookId}
                onClick={() => setSelectedId(book.stampbookId)}
                className={selectedId === book.stampbookId ? "selected" : ""}
              >
                <span>
                  {book.title}
                  <small>
                    스탬프북 #{book.stampbookId} · {book.status}
                  </small>
                  <b>
                    {book.progress.earnedCount} / {book.progress.targetCount}개 적립
                  </b>
                </span>
                <StatusPill tone={book.progress.status === "IN_PROGRESS" ? "green" : "gray"}>
                  {progressStatus(book.progress.status)}
                </StatusPill>
              </button>
            ))}
          </aside>
          <section className="stamp-detail">
            {detail ? (
              <>
                <div className="stamp-title">
                  <div>
                    <small>
                      스탬프북 #{detail.stampbook.stampbookId} · 지역 #{detail.stampbook.regionId}
                    </small>
                    <h2>{detail.stampbook.title}</h2>
                  </div>
                  <StatusPill>{progressStatus(detail.progress.status)}</StatusPill>
                </div>
                <div className="stamp-progress">
                  <span>현재 적립</span>
                  <b>
                    {detail.progress.earnedCount} / {detail.progress.targetCount}
                  </b>
                </div>
                <div className="stamp-circles">
                  {detail.stampbook.targetContents.map((item) => (
                    <div key={item.contentId} className={item.earned ? "complete" : ""}>
                      <b>{item.earned ? "✓" : "+"}</b>
                      <span>{item.title}</span>
                    </div>
                  ))}
                </div>
                <div className="stamp-items">
                  {detail.stampbook.targetContents.map((item) => (
                    <p key={item.contentId}>
                      <span>{item.title}</span>
                      <b>
                        {item.earned && item.earnedAt
                          ? `적립 완료 · ${dateFormatter.format(new Date(item.earnedAt))}`
                          : "방문하면 적립"}
                      </b>
                    </p>
                  ))}
                </div>
                {detail.progress.completionReward && (
                  <div className="stamp-reward">
                    <div>
                      <b>스탬프북 완료 보상</b>
                      <small>모든 스탬프를 모아 받을 수 있는 완료 보상 쿠폰입니다.</small>
                    </div>
                    {issuedRewards[detail.progress.completionReward.stampbookRewardGrantId] ? (
                      <button className="button-outline" disabled>
                        쿠폰 발급 완료
                      </button>
                    ) : (
                      <button
                        className="button-primary"
                        disabled={issuingReward}
                        onClick={issueCompletionReward}
                      >
                        {issuingReward ? "쿠폰 발급 중…" : "완료 보상 쿠폰 발급"}
                      </button>
                    )}
                    {rewardMessage && <p className="green-text">{rewardMessage}</p>}
                  </div>
                )}
                <Notice>
                  안내&nbsp; 대상 콘텐츠마다 유효한 방문 기록으로 스탬프가 한 번만 적립됩니다.
                </Notice>
              </>
            ) : (
              <p>상세를 불러오는 중입니다.</p>
            )}
          </section>
        </div>
      )}
      {earnings && (
        <section className="recent-stamps">
          <h2>최근 스탬프 적립 이력</h2>
          <div>
            {earnings.earnings.length > 0 ? (
              earnings.earnings.map((earning) => (
                <HistoryItem
                  key={earning.stampEarnId}
                  symbol="✓"
                  title={earning.content.title}
                  sub={`방문 ${dateTimeFormatter.format(new Date(earning.visitedAt))} · 적립 ${dateTimeFormatter.format(new Date(earning.earnedAt))}`}
                  date=""
                />
              ))
            ) : (
              <p>스탬프 적립 이력이 없습니다.</p>
            )}
          </div>
        </section>
      )}
    </section>
  );
}
