import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-6">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-6xl sm:text-7xl md:text-8xl font-bold tracking-tight text-foreground">
          Jeenie
        </h1>
        <p className="text-lg sm:text-xl text-muted-foreground max-w-md mx-auto leading-relaxed">
          Your intelligent companion for smarter decisions and seamless experiences.
        </p>
        <div className="pt-4">
          <Button size="lg" className="rounded-full px-8 text-base transition-transform hover:scale-105">
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
