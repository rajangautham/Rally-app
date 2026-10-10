import { createContext, useContext, useState, type ReactNode } from 'react';

type OnboardingValue = {
  dob: string | null;
  setDob: (dob: string) => void;
  rulesAccepted: boolean;
  setRulesAccepted: (v: boolean) => void;
};

const OnboardingContext = createContext<OnboardingValue | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [dob, setDob] = useState<string | null>(null);
  const [rulesAccepted, setRulesAccepted] = useState(false);
  return (
    <OnboardingContext.Provider value={{ dob, setDob, rulesAccepted, setRulesAccepted }}>{children}</OnboardingContext.Provider>
  );
}

export function useOnboarding(): OnboardingValue {
  const v = useContext(OnboardingContext);
  if (!v) throw new Error('useOnboarding must be used inside OnboardingProvider');
  return v;
}
