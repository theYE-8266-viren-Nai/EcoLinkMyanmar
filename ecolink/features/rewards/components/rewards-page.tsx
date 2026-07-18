"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ArrowLeft, Check, Gift, MapPin, TicketCheck, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { redeemPartnerReward } from "@/actions/rewards";
import { AppShell } from "@/components/ecolink/app-shell";
import type { RewardsPageData } from "@/features/rewards/types";
import { useI18n } from "@/lib/i18n";

function RewardClaimDialog({ claimCode, onClose }: { claimCode: string; onClose: () => void }) {
  const { t } = useI18n();

  return (
    <Dialog
      open={Boolean(claimCode)}
      onClose={onClose}
      aria-labelledby="reward-claim-title"
      slotProps={{
        paper: {
          sx: {
            borderRadius: 3,
            p: 2,
            textAlign: "center",
            maxWidth: 400,
            mx: 2,
          },
        },
      }}
    >
      <DialogContent sx={{ p: 2, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <IconButton
          onClick={onClose}
          aria-label="Close"
          sx={{ position: "absolute", right: 12, top: 12 }}
        >
          <X size={20} />
        </IconButton>

        <Avatar sx={{ bgcolor: "rgba(8, 124, 120, 0.1)", color: "primary.main", width: 56, height: 56, mb: 2 }}>
          <TicketCheck size={32} />
        </Avatar>

        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
          {t("rewards.dialogReserved")}
        </Typography>
        <Typography id="reward-claim-title" variant="h6" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.5 }}>
          {t("rewards.dialogTitle")}
        </Typography>

        <Paper
          elevation={0}
          sx={{
            p: 2,
            my: 2.5,
            bgcolor: "rgba(11, 53, 88, 0.05)",
            border: "1.5px dashed",
            borderColor: "divider",
            width: "100%",
            borderRadius: 2,
          }}
        >
          <Typography variant="h4" sx={{ fontWeight: 900, letterSpacing: 1.5, color: "secondary.main" }}>
            {claimCode}
          </Typography>
        </Paper>

        <Typography variant="caption" color="text.secondary">
          {t("rewards.dialogHelp")}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, justifyContent: "center" }}>
        <Button fullWidth onClick={onClose} variant="contained" size="large">
          {t("rewards.done")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function RewardsPage({ initialData }: { initialData: RewardsPageData }) {
  const { t } = useI18n();
  const [balance, setBalance] = useState(initialData.balance);
  const [offers, setOffers] = useState(initialData.offers);
  const [redemptions, setRedemptions] = useState(initialData.redemptions);
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState(initialData.errorMessage ?? "");
  const [redeemingId, setRedeemingId] = useState<string>();

  async function redeem(rewardDatabaseId: string) {
    setRedeemingId(rewardDatabaseId);
    try {
      const reward = offers.find((item) => item.databaseId === rewardDatabaseId);
      if (!reward) throw new Error("This reward is no longer available.");
      const result = await redeemPartnerReward(reward.databaseId);
      if (!result.ok) throw new Error(result.error);
      setBalance((current) => typeof result.balance === "number" ? result.balance : Math.max(0, current - reward.points));
      setOffers((current) => current.map((offer) => (
        offer.databaseId === reward.databaseId ? { ...offer, stock: Math.max(0, offer.stock - 1) } : offer
      )));
      setRedemptions((current) => [{
        id: result.redemptionId,
        rewardOfferId: reward.databaseId,
        claimCode: result.claimCode,
        status: "reserved",
      }, ...current]);
      setClaimCode(result.claimCode);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reward could not be reserved.");
    } finally {
      setRedeemingId(undefined);
    }
  }

  return (
    <AppShell>
      <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
        {/* Back navigation */}
        <Button
          component={Link}
          href="/"
          startIcon={<ArrowLeft size={16} />}
          sx={{ width: "fit-content", alignSelf: "flex-start", ml: -1 }}
        >
          {t("rewards.back")}
        </Button>

        {/* Intro */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase" }}>
            {t("rewards.kicker")}
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.5 }}>
            {t("rewards.title")}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t("rewards.subtitle")}
          </Typography>
        </Box>

        {/* Balance card */}
        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "primary.main", bgcolor: "rgba(8, 124, 120, 0.03)" }}>
          <CardContent sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                {t("rewards.balance")}
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main", mt: 0.25 }}>
                {balance}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              {t("rewards.points")}
            </Typography>
          </CardContent>
        </Card>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>{error}</Alert>
        )}

        {/* Rewards Section */}
        <Box>
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase" }}>
              {t("rewards.offers")}
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
              {t("rewards.redeemPoints")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t("rewards.deducted")}
            </Typography>
          </Box>

          <Stack spacing={2}>
            {offers.map((reward) => {
              const reserved = redemptions.find((item) => item.rewardOfferId === reward.databaseId && item.status === "reserved");
              const isRedeeming = redeemingId === reward.databaseId;
              return (
                <Card key={reward.id} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                  <Box sx={{ position: "relative", height: 142, bgcolor: "rgba(11, 53, 88, 0.04)" }}>
                    <Box
                      component="img"
                      src={reward.imageUrl}
                      alt={reward.title}
                      loading="lazy"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = "/ecolink-icon-512.png";
                      }}
                      sx={{
                        display: "block",
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        background: "linear-gradient(180deg, rgba(7, 27, 44, 0.04) 38%, rgba(7, 27, 44, 0.52) 100%)",
                      }}
                    />
                    <Avatar
                      sx={{
                        position: "absolute",
                        left: 12,
                        bottom: 12,
                        bgcolor: "rgba(255, 255, 255, 0.92)",
                        color: "primary.main",
                        width: 34,
                        height: 34,
                      }}
                    >
                      <Gift size={16} />
                    </Avatar>
                    <Box sx={{ position: "absolute", right: 12, top: 12 }}>
                      <ChipLabel label={t("rewards.left", { count: reward.stock })} color="#7a4b08" bgcolor="rgba(255, 255, 255, 0.92)" />
                    </Box>
                  </Box>

                  <CardContent sx={{ p: 2, pb: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {reward.partner}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.25 }}>
                      {reward.title}
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
                      {reward.description}
                    </Typography>

                    <Typography variant="caption" sx={{ display: "flex", gap: 0.5, alignItems: "center", mt: 1.5, color: "text.secondary" }}>
                      <MapPin size={11} /> {reward.township}
                    </Typography>
                  </CardContent>

                  <Divider />

                  <CardActions sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
                      {reward.points} points
                    </Typography>
                    <Button
                      size="small"
                      variant="contained"
                      disabled={balance < reward.points || reward.stock <= 0 || Boolean(reserved) || Boolean(redeemingId)}
                      onClick={() => redeem(reward.databaseId)}
                    >
                      {reserved ? <><Check size={14} style={{ marginRight: 4 }} /> {t("rewards.reserved")}</> : isRedeeming ? "Reserving…" : t("rewards.redeem")}
                    </Button>
                  </CardActions>

                  {reserved && (
                    <Box sx={{ p: 1.5, bgcolor: "rgba(11, 53, 88, 0.04)", borderTop: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
                      <TicketCheck size={14} color="#0b3558" />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "secondary.main" }}>
                        {t("rewards.claimCode", { code: reserved.claimCode })}
                      </Typography>
                    </Box>
                  )}
                </Card>
              );
            })}
          </Stack>
        </Box>

        {/* Cleanup Milestones (Shared Action) */}
        {/* <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: "4px solid", borderLeftColor: "#b97818" }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <Avatar sx={{ bgcolor: "rgba(185, 120, 24, 0.1)", color: "#b97818", width: 38, height: 38 }}>
                <HandHeart size={20} />
              </Avatar>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#b97818", textTransform: "uppercase" }}>
                  {t("rewards.shared")}
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
                  {t("rewards.cleanupTitle")}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              {t("rewards.cleanupHelp")}
            </Typography>

            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{t("rewards.progress")}</Typography>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main" }}>74%</Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={74}
                sx={{
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(0, 0, 0, 0.05)",
                  "& .MuiLinearProgress-bar": { bgcolor: "#b97818" },
                }}
              />
            </Stack>

            <Divider sx={{ my: 2 }} />

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, display: "block", mb: 0.5 }}>
              {t("rewards.sponsor")}
            </Typography>
            <Typography variant="body2" sx={{ color: "secondary.main", mb: 2, fontWeight: 700 }}>
              {t("rewards.sponsorItems")}
            </Typography>

            <Alert severity="info" sx={{ borderRadius: 2 }}>
              Cleanup contributions are temporarily unavailable while all point spending is moved to the verified ledger.
            </Alert>
          </CardContent>
        </Card> */}

        {claimCode && <RewardClaimDialog claimCode={claimCode} onClose={() => setClaimCode("")} />}
      </Box>
    </AppShell>
  );
}

function ChipLabel({ label, color, bgcolor }: { label: string; color: string; bgcolor: string }) {
  return (
    <Box
      sx={{
        px: 1,
        py: 0.25,
        borderRadius: "8px",
        bgcolor,
        color,
        fontSize: "0.65rem",
        fontWeight: 800,
      }}
    >
      {label}
    </Box>
  );
}
