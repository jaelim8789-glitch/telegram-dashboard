export function useAutoProfile() {
  const hour = new Date().getHours();
  const day = new Date().getDay();
  return {
    timeContext: hour < 6 ? "night" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening",
    dayType: day === 0 || day === 6 ? "weekend" : "weekday",
  };
}
