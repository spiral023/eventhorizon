// frontend/src/utils/greeting.ts

export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 11) {
    return "Guten Morgen";
  }
  if (hour >= 11 && hour < 18) {
    return "Guten Tag";
  }
  if (hour >= 18 && hour < 23) {
    return "Guten Abend";
  }
  return "Hallo";
}
