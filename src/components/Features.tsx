
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Mail, MousePointer, Truck, Users, BarChart3, Zap, Smartphone } from "lucide-react";

export const Features = () => {
  const popupTypes = [
    {
      icon: ShoppingCart,
      title: "Cart Abandonment Recovery",
      description: "Automatically save carts with personalized discount codes and 15-minute countdown timers",
      badge: "High Converting"
    },
    {
      icon: Mail,
      title: "Smart Email Capture",
      description: "First-time visitor discounts and newsletter signups with real-time email validation",
      badge: "List Building"
    },
    {
      icon: MousePointer,
      title: "Exit Intent Discount",
      description: "Last-chance offers triggered by exit behavior (desktop only with 2-second validation)",
      badge: "Revenue Recovery"
    },
    {
      icon: Truck,
      title: "Free Shipping Progress",
      description: "Visual progress bars showing remaining amount to reach free shipping threshold",
      badge: "AOV Booster"
    },
    {
      icon: Users,
      title: "Welcome New Visitors",
      description: "Timed welcome messages with value propositions for first-time site visitors",
      badge: "First Impression"
    }
  ];

  const keyFeatures = [
    {
      icon: BarChart3,
      title: "Revenue Attribution",
      description: "Track actual sales generated, not just impressions and clicks"
    },
    {
      icon: Smartphone,
      title: "Mobile-First Design",
      description: "Optimized for 76% mobile traffic with touch-friendly interfaces"
    },
    {
      icon: Zap,
      title: "5-Minute Setup",
      description: "No coding required with native Shopify theme integration"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Complete Popup Solution
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            5 Essential Popup Types That Actually Convert
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Every popup type is designed with one goal: turning visitors into customers
          </p>
        </div>

        {/* Popup Types */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
          {popupTypes.map((popup, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300 group">
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                    <popup.icon className="w-6 h-6 text-white" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {popup.badge}
                  </Badge>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{popup.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{popup.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Key Features */}
        <div className="grid md:grid-cols-3 gap-8">
          {keyFeatures.map((feature, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <feature.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
