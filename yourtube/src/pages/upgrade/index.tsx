import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { CheckCircle2, Crown, Sparkles } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    description: "For casual viewers",
    features: [
      "1 Download per day",
      "Standard Quality",
      "Contains Ads",
    ],
    card:
      "bg-gradient-to-br from-stone-100 via-white to-stone-50 border-stone-300",
    header:
      "bg-gradient-to-br from-stone-200 to-stone-100 text-[#3b2416]",
    button:
      "bg-[#3b2416] hover:bg-[#51321f] text-white",
    icon: "text-[#3b2416]",
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 499,
    description: "For regular viewers",
    features: [
      "5 Downloads per day",
      "HD Quality",
      "Limited Ads",
    ],
    card:
      "bg-gradient-to-br from-[#f4e0d0] via-[#fff8f2] to-[#ead0bc] border-[#b87333]/50",
    header:
      "bg-gradient-to-r from-[#9a5425] to-[#c47a43] text-white",
    button:
      "bg-[#9a5425] hover:bg-[#7d421d] text-white",
    icon: "text-[#9a5425]",
  },
  {
    id: "silver",
    name: "Silver",
    price: 999,
    description: "For premium viewers",
    features: [
      "10 Downloads per day",
      "Full HD Quality",
      "No Ads",
    ],
    card:
      "bg-gradient-to-br from-[#dfe4ea] via-[#f8fafc] to-[#cbd2da] border-[#8c98a5]/60",
    header:
      "bg-gradient-to-r from-[#56616d] to-[#8995a1] text-white",
    button:
      "bg-[#56616d] hover:bg-[#424c56] text-white",
    icon: "text-[#56616d]",
  },
  {
    id: "gold",
    name: "Gold",
    price: 1999,
    description: "The ultimate experience",
    features: [
      "20 Downloads per day",
      "4K Quality",
      "No Ads",
      "Priority Support",
    ],
    card:
      "bg-gradient-to-br from-[#fff1b8] via-[#fffaf0] to-[#efd27a] border-[#c79a24] shadow-xl shadow-yellow-900/10",
    header:
      "bg-gradient-to-r from-[#a97905] via-[#d4a72c] to-[#b8860b] text-white",
    button:
      "bg-gradient-to-r from-[#a97905] to-[#d19f20] hover:from-[#896303] hover:to-[#b8890f] text-white",
    icon: "text-[#a97905]",
    popular: true,
  },
];

const UpgradePage = () => {
  const { user } = useUser();
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async (planId: string) => {
    if (!user) {
      alert("Please login to upgrade your plan");
      return;
    }

    if (planId === "free") {
      alert("You are already on the Free plan");
      return;
    }

    setLoading(true);

    try {
      const orderRes = await axiosInstance.post("/payment/order", {
        plan: planId,
        userId: user._id,
      });

      const order = orderRes.data;

      const confirmPayment = window.confirm(
        `Demo Payment\n\nPlan: ${
          planId.charAt(0).toUpperCase() + planId.slice(1)
        }\nAmount: ₹${order.amount / 100}\n\nClick OK to simulate successful payment.`
      );

      if (!confirmPayment) {
        setLoading(false);
        return;
      }

      const verifyRes = await axiosInstance.post("/payment/verify", {
        demo_order_id: order.id,
        userId: user._id,
        plan: planId,
      });

      alert(
        `Payment successful!\n\nYour ${planId.toUpperCase()} plan is now active for 30 days.`
      );

      console.log("Payment:", verifyRes.data);

      window.location.reload();
    } catch (error: any) {
      console.error("Payment Error:", error);

      alert(
        error.response?.data?.message ||
          "Something went wrong during payment"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fffaf5] via-white to-[#f7efe7] py-14 px-4">
      <div className="container mx-auto">

        {/* Heading */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#c79a24]/30 bg-[#fff7dc] px-4 py-2 mb-5">
            <Sparkles className="h-4 w-4 text-[#b8860b]" />
            <span className="text-sm font-medium text-[#6b4b16]">
              YourTube Premium
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-[#2f1b10]">
            Upgrade Your Experience
          </h1>

          <p className="mt-4 text-[#6f625a] max-w-xl mx-auto">
            Choose the perfect plan and unlock more quality, downloads,
            and a better viewing experience.
          </p>
        </div>

        {/* Plans */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-7 max-w-7xl mx-auto">
          {PLANS.map((plan) => (
            <div key={plan.id} className="relative">

              {/* Popular Badge */}
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-10">
                  <div className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#a97905] to-[#d4a72c] px-5 py-2 text-xs font-bold text-white shadow-lg">
                    <Crown className="h-3.5 w-3.5" />
                    MOST POPULAR
                  </div>
                </div>
              )}

              <Card
                className={`h-full flex flex-col overflow-hidden border-2 rounded-2xl shadow-md hover:-translate-y-1 hover:shadow-2xl transition-all duration-300 ${plan.card}`}
              >
                {/* Header */}
                <CardHeader
                  className={`relative px-6 py-7 ${plan.header}`}
                >
                  <CardTitle className="text-2xl font-bold">
                    {plan.name}
                  </CardTitle>

                  <CardDescription className="text-white/80">
                    {plan.description}
                  </CardDescription>

                  <div className="pt-4">
                    <span className="text-4xl font-bold">
                      {plan.price === 0
                        ? "Free"
                        : `₹${plan.price}`}
                    </span>

                    {plan.price !== 0 && (
                      <span className="text-sm ml-1 text-white/75">
                        / month
                      </span>
                    )}
                  </div>
                </CardHeader>

                {/* Features */}
                <CardContent className="flex-1 px-6 py-7">
                  <p className="text-xs uppercase tracking-widest font-semibold text-[#806f63] mb-5">
                    What's included
                  </p>

                  <div className="space-y-4">
                    {plan.features.map((feature) => (
                      <div
                        key={feature}
                        className="flex items-center gap-3"
                      >
                        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 shadow-sm">
                          <CheckCircle2
                            className={`h-4 w-4 ${plan.icon}`}
                          />
                        </div>

                        <span className="text-sm font-medium text-[#3b2416]">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>

                {/* Button */}
                <CardFooter className="px-6 pb-7">
                  <Button
                    className={`w-full h-11 rounded-xl font-semibold shadow-sm transition-all ${plan.button}`}
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={loading || plan.id === "free"}
                  >
                    {plan.id === "free"
                      ? "Current Plan"
                      : loading
                      ? "Processing..."
                      : `Choose ${plan.name}`}
                  </Button>
                </CardFooter>
              </Card>
            </div>
          ))}
        </div>

        {/* Bottom */}
        <div className="text-center mt-10">
          <p className="text-xs text-[#806f63]">
            Demo Payment Mode • No real money is charged
          </p>
        </div>
      </div>
    </div>
  );
};

export default UpgradePage;