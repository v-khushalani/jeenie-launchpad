import React from 'react';
import { motion } from 'framer-motion';

interface Feature {
  id: string;
  title: string;
  description: string;
  Icon: React.FC<React.SVGProps<SVGSVGElement>>;
}

interface FeatureCardProps {
  feature: Feature;
  isVisible: boolean;
  delay: number;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({ feature, isVisible, delay }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.9 }}
      animate={{
        opacity: isVisible ? 1 : 0,
        y: isVisible ? 0 : 50,
        scale: isVisible ? 1 : 0.9,
      }}
      transition={{ delay, duration: 0.6, ease: 'easeOut' }}
      className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-2xl shadow-blue-500/10"
    >
      <div className="flex justify-center mb-4">
        <feature.Icon className="text-teal-400" />
      </div>
      <h3 className="text-center text-xl font-bold text-teal-300 mb-2">{feature.title}</h3>
      <p className="text-center text-blue-200/80 text-sm">{feature.description}</p>
    </motion.div>
  );
};
