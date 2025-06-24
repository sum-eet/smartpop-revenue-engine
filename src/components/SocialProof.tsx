
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Star, TrendingUp, DollarSign, Users } from "lucide-react";

export const SocialProof = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      business: "Boutique Fashion Co.",
      revenue: "$32K/month",
      quote: "SmartPop increased our email signups by 340% in the first month. The revenue tracking finally shows me what's actually working.",
      avatar: "SC",
      rating: 5
    },
    {
      name: "Mike Rodriguez",
      business: "Peak Supplements",
      revenue: "$78K/month", 
      quote: "Setup took literally 4 minutes. The cart abandonment popup alone recovered $8,000 in sales last month.",
      avatar: "MR",
      rating: 5
    },
    {
      name: "Emma Thompson",
      business: "Home & Garden Plus",
      revenue: "$45K/month",
      quote: "Finally, a popup solution that doesn't overwhelm me with features I don't need. Clean, simple, and it just works.",
      avatar: "ET",
      rating: 5
    }
  ];

  const stats = [
    {
      icon: TrendingUp,
      value: "10.2%",
      label: "Average Conversion Rate",
      description: "Across all popup types"
    },
    {
      icon: DollarSign,
      value: "$50K+",
      label: "Revenue Attributed",
      description: "In first 6 months"
    },
    {
      icon: Users,
      value: "100+",
      label: "Active Merchants",
      description: "And growing fast"
    }
  ];

  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Success Stories
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Growing Shopify Stores Trust SmartPop
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Real merchants, real results, real revenue growth
          </p>
        </div>

        {/* Stats */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {stats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                <stat.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</div>
              <div className="text-lg font-semibold text-gray-700 mb-1">{stat.label}</div>
              <div className="text-sm text-gray-500">{stat.description}</div>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <Card key={index} className="hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-1 mb-4">
                  {[...Array(testimonial.rating)].map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                
                <p className="text-gray-600 mb-6 italic">"{testimonial.quote}"</p>
                
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {testimonial.avatar}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">{testimonial.name}</div>
                    <div className="text-sm text-gray-500">{testimonial.business}</div>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {testimonial.revenue}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};
