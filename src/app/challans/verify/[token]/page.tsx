import { companyInfo } from "@/lib/company";
import { CHALLAN_STATUS_LABELS, CHALLAN_TYPE_LABELS, colorLabel } from "@/lib/challan";
import { formatDate, formatNumber } from "@/lib/utils";
import { MagsLogo } from "@/components/brand/mags-logo";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

async function getChallan(token: string) {
  return prisma.challan.findUnique({
    where: { verifiedToken: token },
    include: {
      items: { include: { profile: true } },
      vendor: true,
    },
  });
}

export default async function VerifyChallanPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const challan = await getChallan(token);

  return (
    <div className="min-h-screen bg-[#DFE5F5] p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="rounded-xl bg-white p-4 shadow-sm w-fit">
          <MagsLogo variant="full" />
        </div>

        {!challan ? (
          <Card>
            <CardContent className="flex items-center gap-3 pt-6 text-destructive">
              <XCircle className="h-8 w-8" />
              <div>
                <p className="font-semibold">Verification Failed</p>
                <p className="text-sm text-muted-foreground">Invalid or expired challan token.</p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <Card className="border-emerald-200 bg-emerald-50/50">
              <CardContent className="flex items-center gap-3 pt-6">
                <CheckCircle className="h-8 w-8 text-emerald-600" />
                <div>
                  <p className="font-semibold text-emerald-800">Verified MAGS Challan</p>
                  <p className="text-sm text-emerald-700">This document is authentic.</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{challan.challanNumber}</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {CHALLAN_TYPE_LABELS[challan.type as keyof typeof CHALLAN_TYPE_LABELS]} ·{" "}
                  {formatDate(challan.issueDate)}
                </p>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Status</span>
                  <Badge>{CHALLAN_STATUS_LABELS[challan.status as keyof typeof CHALLAN_STATUS_LABELS]}</Badge>
                </div>
                {challan.vendor && (
                  <div>
                    <p className="font-medium">{challan.vendor.name}</p>
                    {challan.vendor.phone && <p className="text-muted-foreground">{challan.vendor.phone}</p>}
                  </div>
                )}
                {challan.color && (
                  <div className="flex justify-between">
                    <span>Color</span>
                    <span>{colorLabel(challan.color)}</span>
                  </div>
                )}
                <div className="flex justify-between font-medium border-t pt-2">
                  <span>Total Weight</span>
                  <span>{formatNumber(challan.totalWeight)} KG</span>
                </div>
                <ul className="border-t pt-2 space-y-1">
                  {challan.items?.map((item: { profile: { profileCode: string }; quantity: number; weight: number }, i: number) => (
                    <li key={i} className="flex justify-between">
                      <span>{item.profile.profileCode}</span>
                      <span>{item.quantity} pcs · {formatNumber(item.weight)} KG</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </>
        )}

        <p className="text-center text-xs text-muted-foreground">
          {companyInfo.name} · {companyInfo.phone}
        </p>
      </div>
    </div>
  );
}
