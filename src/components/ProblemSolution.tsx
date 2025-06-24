
import { Card, CardContent } from "@/components/ui/card";
import { X, Check, AlertTriangle, Smile } from "lucide-react";

export const ProblemSolution = () => {
  const problems = [
    {
      icon: AlertTriangle,
      title: "100+ Confusing Features",
      description: "Enterprise solutions with complexity overload"
    },
    {
      icon: AlertTriangle,
      title: "Poor Mobile Experience",
      description: "Desktop-first designs failing on 76% mobile traffic"
    },
    {
      icon: AlertTriangle,
      title: "Hidden Fees & Pricing",
      description: "Complex tiers and surprise charges"
    },
    {
      icon: AlertTriangle,
      title: "Vanity Metrics Only",
      description: "Impressions and clicks, not actual revenue"
    }
  ];

  const solutions = [
    {
      icon: Check,
      title: "5 Essential Popup Types",
      description: "Everything you need, nothing you don't"
    },
    {
      icon: Check,
      title: "Mobile-First Design",
      description: "Optimized for where your customers actually shop"
    },
    {
      icon: Check,
      title: "Transparent Pricing",
      description: "Flat rates with generous free tier"
    },
    {
      icon: Check,
      title: "Revenue Attribution",
      description: "Track real sales, not just vanity metrics"
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Why Most Popup Solutions Fail SMB Merchants
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Current solutions are built for enterprise, not growing Shopify stores
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Problems */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <X className="w-6 h-6 text-red-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">The Problem</h3>
            </div>
            
            {problems.map((problem, index) => (
              <Card key={index} className="border-red-200 hover:border-red-300 transition-colors">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <problem.icon className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{problem.title}</h4>
                      <p className="text-gray-600">{problem.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Solutions */}
          <div className="space-y-6">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Smile className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">SmartPop Solution</h3>
            </div>
            
            {solutions.map((solution, index) => (
              <Card key={index} className="border-green-200 hover:border-green-300 transition-colors bg-green-50/50">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <solution.icon className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">{solution.title}</h4>
                      <p className="text-gray-600">{solution.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
