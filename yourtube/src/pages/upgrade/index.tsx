import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import axiosInstance from "@/lib/axiosinstance";
import { useUser } from "@/lib/AuthContext";
import { CheckCircle2 } from "lucide-react";

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: 0,
    features: ["1 Download per day", "Standard Quality", "Contains Ads"],
    color: "bg-gray-100",
  },
  {
    id: "bronze",
    name: "Bronze",
    price: 499,
    features: ["5 Downloads per day", "HD Quality", "Limited Ads"],
    color: "bg-orange-100",
  },
  {
    id: "silver",
    name: "Silver",
    price: 999,
    features: ["20 Downloads per day", "Full HD Quality", "No Ads"],
    color: "bg-slate-200",
  },
  {
    id: "gold",
    name: "Gold",
    price: 1999,
    features: ["Unlimited Downloads", "4K Quality", "No Ads", "Priority Support"],
    color: "bg-yellow-100",
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
      // 1. Create Razorpay Order
      const orderRes = await axiosInstance.post("/payment/order", { plan: planId });
      const order = orderRes.data;

      // 2. Open Razorpay Checkout
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "YourTube Premium",
        description: `Upgrade to ${planId} plan`,
        order_id: order.id,
        handler: async (response: any) => {
          try {
            // 3. Verify payment on backend
            await axiosInstance.post("/payment/verify", {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              userId: user._id,
              plan: planId,
            });
            alert("Payment successful! Your plan has been upgraded.");
            window.location.reload();
          } catch (err) {
            alert("Payment verification failed.");
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: "#EF4444",
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error: any) {
      alert(error.response?.data?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto py-12 px-4">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Upgrade Your Experience</h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          Choose the plan that suits you best and unlock premium features like unlimited downloads and ad-free viewing.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {PLANS.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.id === user?.plan ? "ring-2 ring-primary" : ""}`}>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <div className="text-3xl font-bold mt-2">
                {plan.price === 0 ? "Free" : `₹${plan.price}`}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <ul className="space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <CheckCircle2 size={16} className="text-green-500" />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="flex justify-center">
              <Button
                disabled={loading || plan.id === user?.plan}
                onClick={() => handleUpgrade(plan.id)}
                className="w-full"
                variant={plan.id === user?.plan ? "outline" : "default"}
              >
                {plan.id === user?.plan ? "Current Plan" : "Upgrade Now"}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default UpgradePage;
