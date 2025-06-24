
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, Gift, Clock, Mail } from "lucide-react";

export const PopupDemo = () => {
  const [activeDemo, setActiveDemo] = useState("cart");

  const demos = {
    cart: {
      title: "Cart Abandonment Recovery",
      content: (
        <div className="bg-white rounded-lg shadow-2xl max-w-md mx-auto p-6 relative">
          <button className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-orange-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Don't Leave Empty Handed!</h3>
            <p className="text-gray-600 mb-4">Get 15% off your cart before it expires</p>
            <div className="bg-gray-50 rounded-lg p-4 mb-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Vintage Denim Jacket</span>
                <span className="text-sm font-semibold">$89.99</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">White Sneakers</span>
                <span className="text-sm font-semibold">$129.99</span>
              </div>
              <div className="border-t pt-2 mt-2 flex justify-between font-bold">
                <span>Total: $219.98</span>
                <span className="text-green-600">Save $33!</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2 mb-4 text-orange-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm font-semibold">14:32 remaining</span>
            </div>
            <input 
              type="email" 
              placeholder="Enter your email"
              className="w-full p-3 border border-gray-300 rounded-lg mb-3"
            />
            <Button className="w-full bg-orange-600 hover:bg-orange-700">
              Save My Cart & Get 15% Off
            </Button>
          </div>
        </div>
      )
    },
    email: {
      title: "Email Capture Popup",
      content: (
        <div className="bg-gradient-to-br from-blue-600 to-purple-700 rounded-lg shadow-2xl max-w-md mx-auto p-6 relative text-white">
          <button className="absolute top-4 right-4 text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
          <div className="text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Mail className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold mb-2">Welcome to StyleCo!</h3>
            <p className="text-blue-100 mb-6">Join 10,000+ fashion lovers and get exclusive access to new arrivals</p>
            <div className="bg-white/10 rounded-lg p-4 mb-4 border border-white/20">
              <div className="text-3xl font-bold mb-1">10% OFF</div>
              <div className="text-sm text-blue-100">Your First Order</div>
            </div>
            <input 
              type="email" 
              placeholder="Enter your email address"
              className="w-full p-3 border border-white/30 rounded-lg mb-3 bg-white/10 text-white placeholder-white/60"
            />
            <Button className="w-full bg-white text-purple-700 hover:bg-gray-100 font-semibold">
              Get My Discount Code
            </Button>
          </div>
        </div>
      )
    }
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            Live Demo
          </Badge>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            See SmartPop in Action
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Beautiful, conversion-optimized popups that work on any device
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-gray-900 mb-6">Choose a popup type:</h3>
            {Object.entries(demos).map(([key, demo]) => (
              <Card 
                key={key}
                className={`cursor-pointer transition-all duration-300 ${
                  activeDemo === key 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'hover:border-gray-300'
                }`}
                onClick={() => setActiveDemo(key)}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full ${
                      activeDemo === key ? 'bg-blue-500' : 'bg-gray-300'
                    }`}></div>
                    <span className="font-semibold text-gray-900">{demo.title}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 min-h-[500px] flex items-center justify-center">
            {demos[activeDemo as keyof typeof demos].content}
          </div>
        </div>
      </div>
    </section>
  );
};
