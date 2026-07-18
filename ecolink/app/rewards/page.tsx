"use client";

import Alert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardActions from "@mui/material/CardActions";
import CardContent from "@mui/material/CardContent";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Divider from "@mui/material/Divider";
import FormControl from "@mui/material/FormControl";
import IconButton from "@mui/material/IconButton";
import InputLabel from "@mui/material/InputLabel";
import LinearProgress from "@mui/material/LinearProgress";
import MenuItem from "@mui/material/MenuItem";
import Paper from "@mui/material/Paper";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import { ArrowLeft, Check, Gift, HandHeart, MapPin, TicketCheck, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import { AppShell } from "@/components/ecolink/app-shell";
import { PARTNER_REWARDS } from "@/lib/ecolink-data";
import { useEcoLink } from "@/providers/ecolink-context";
import { redeemPartnerReward } from "@/actions/rewards";

const DEMO_MODE = process.env.NEXT_PUBLIC_ECOLINK_DEMO_MODE !== "false";

function RewardClaimDialog({ claimCode, onClose }: { claimCode: string; onClose: () => void }) {
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
          REWARD RESERVED
        </Typography>
        <Typography id="reward-claim-title" variant="h6" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.5 }}>
          Show this code at the partner center
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
          Your points were deducted when the reservation was created.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ p: 2, pt: 0, justifyContent: "center" }}>
        <Button fullWidth onClick={onClose} variant="contained" size="large">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function RewardsPage() {
  const { state, balance, redeemReward, contributeToCleanup } = useEcoLink();
  const [claimCode, setClaimCode] = useState("");
  const [error, setError] = useState("");
  const [contribution, setContribution] = useState(100);

  async function redeem(rewardId: string) {
    try {
      const reward = PARTNER_REWARDS.find((item) => item.id === rewardId);
      if (!reward) throw new Error("This reward is no longer available.");
      const result = DEMO_MODE
        ? { ok: true as const, ...redeemReward(rewardId) }
        : await redeemPartnerReward(reward.databaseId);
      if (!result.ok) throw new Error(result.error);
      setClaimCode(result.claimCode);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The reward could not be reserved.");
    }
  }

  function contribute() {
    try {
      contributeToCleanup(contribution);
      setError("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The contribution could not be completed.");
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
          Back home
        </Button>

        {/* Intro */}
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 800, color: "primary.main", textTransform: "uppercase" }}>
            Make your points useful
          </Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, color: "secondary.main", mt: 0.5 }}>
            Choose what your recycling unlocks
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            Reserve a practical partner reward, or help a funded community cleanup reach its goal.
          </Typography>
        </Box>

        {/* Balance card */}
        <Card variant="outlined" sx={{ borderRadius: 3, borderColor: "primary.main", bgcolor: "rgba(8, 124, 120, 0.03)" }}>
          <CardContent sx={{ p: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                AVAILABLE BALANCE
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 900, color: "primary.main", mt: 0.25 }}>
                {balance}
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              points
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
              Local Partner Offers
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: "secondary.main" }}>
              Redeem your points
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Points are deducted when you reserve.
            </Typography>
          </Box>

          <Stack spacing={2}>
            {PARTNER_REWARDS.map((reward) => {
              const reserved = state.redemptions.find((item) => item.rewardId === reward.id);
              return (
                <Card key={reward.id} variant="outlined" sx={{ borderRadius: 3 }}>
                  <CardContent sx={{ p: 2, pb: 1 }}>
                    <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", mb: 1.5 }}>
                      <Avatar sx={{ bgcolor: "rgba(8, 124, 120, 0.08)", color: "primary.main", width: 34, height: 34 }}>
                        <Gift size={16} />
                      </Avatar>
                      <ChipLabel label={`${reward.stock} left`} color="#b97818" bgcolor="rgba(185, 120, 24, 0.08)" />
                    </Stack>

                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>
                      {reward.partner}
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
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
                      disabled={balance < reward.points || Boolean(reserved)}
                      onClick={() => redeem(reward.id)}
                    >
                      {reserved ? <><Check size={14} style={{ marginRight: 4 }} /> Reserved</> : `Redeem`}
                    </Button>
                  </CardActions>

                  {reserved && (
                    <Box sx={{ p: 1.5, bgcolor: "rgba(11, 53, 88, 0.04)", borderTop: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 1 }}>
                      <TicketCheck size={14} color="#0b3558" />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: "secondary.main" }}>
                        Claim Code: {reserved.claimCode}
                      </Typography>
                    </Box>
                  )}
                </Card>
              );
            })}
          </Stack>
        </Box>

        {/* Cleanup Milestones (Shared Action) */}
        <Card variant="outlined" sx={{ borderRadius: 3, borderLeft: "4px solid", borderLeftColor: "#b97818" }}>
          <CardContent sx={{ p: 2 }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1.5 }}>
              <Avatar sx={{ bgcolor: "rgba(185, 120, 24, 0.1)", color: "#b97818", width: 38, height: 38 }}>
                <HandHeart size={20} />
              </Avatar>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 800, color: "#b97818", textTransform: "uppercase" }}>
                  Shared Action
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "secondary.main" }}>
                  Help unlock a Hlaing riverbank cleanup
                </Typography>
              </Box>
            </Stack>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
              Community points unlock a sponsor commitment; the points themselves are not money.
            </Typography>

            <Stack spacing={0.5} sx={{ mb: 2 }}>
              <Stack direction="row" sx={{ justifyContent: "space-between" }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>7,400 of 10,000 points</Typography>
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
              SPONSOR FUND COMMITS
            </Typography>
            <Typography variant="body2" sx={{ color: "secondary.main", mb: 2, fontWeight: 700 }}>
              Gloves, collection bags, volunteer transport and licensed waste hauling.
            </Typography>

            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
              Your contribution: {state.cleanupContribution} / 300 points
            </Typography>

            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <FormControl size="small" variant="filled" sx={{ flexGrow: 1 }}>
                <InputLabel id="contribution-amount-label">Contribute Amount</InputLabel>
                <Select
                  labelId="contribution-amount-label"
                  value={contribution}
                  onChange={(e) => setContribution(Number(e.target.value))}
                >
                  <MenuItem value={50}>50 points</MenuItem>
                  <MenuItem value={100}>100 points</MenuItem>
                  <MenuItem value={200}>200 points</MenuItem>
                  <MenuItem value={300}>300 points</MenuItem>
                </Select>
              </FormControl>
              <Button onClick={contribute} variant="contained" color="secondary" sx={{ minHeight: 40 }}>
                Contribute
              </Button>
            </Stack>
          </CardContent>
        </Card>

        <Typography variant="caption" color="text.secondary" align="center" sx={{ display: "block", fontStyle: "italic", mt: 1 }}>
          Partner names, stock and offers shown here are illustrative. A live rollout should publish only signed, funded agreements.
        </Typography>

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
