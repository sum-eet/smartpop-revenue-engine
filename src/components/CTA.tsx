
import { Button } from "@/components/ui/button";
import { ArrowRight, Zap, TrendingUp } from "lucide-react";

export const CTA = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white relative overflow-hidden">
      <div className="absolute inset-0 bg-black/20"></div>
      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <div className="space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold leading-tight">
            Ready to Convert More Visitors
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
              Into Real Revenue?
            </span>
          </h2>
          
          <p className="text-xl md:text-2xl text-blue-100 max-w-3xl mx-auto">
            Join growing Shopify merchants who've discovered the power of 
            <strong> revenue-focused popup marketing</strong>
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button size="lg" className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white px-8 py-4 text-lg font-semibold shadow-lg hover:shadow-xl transition-all duration-300">
              Start Your Free Trial
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20 px-8 py-4 text-lg">
              Schedule Demo
            </Button>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 pt-8">
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <Zap className="w-6 h-6 text-yellow-400" />
              </div>
              <div className="text-center">
                <div className="font-semibold">5-Minute Setup</div>
                <div className="text-sm text-blue-200">No coding required</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-400" />
              </div>
              <div className="text-center">
                <div className="font-semibold">10%+ Conversion</div>
                <div className="text-sm text-blue-200">Average across all types</div>
              </div>
            </div>
            
            <div className="flex flex-col items-center gap-2">
              <div className="w-12 h-12 bg-white/10 rounded-lg flex items-center justify-center">
                <div className="text-lg font-bold">$0</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">Free Forever Plan</div>
                <div className="text-sm text-blue-200">1,000 views included</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-transparent rounded-full blur-3xl"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-indigo-400/20 to-transparent rounded-full blur-3xl"></div>
    </section>
  );
};
