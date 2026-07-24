import { useEffect, useState } from "react";

export function useBatterySaverAuto() {
  const [isLowPowerMode, setIsLowPowerMode] = useState(false);

  useEffect(() => {
    // 배터리 정보가 있는지 확인하고 사용
    if ('getBattery' in navigator || 'battery' in navigator) {
      const getBattery = () => {
        // @ts-expect-error - Battery API is experimental, varies by browser
        return navigator.getBattery ? navigator.getBattery() : (navigator as any).battery;
      };

      getBattery().then((battery: any) => {
        const updateBatteryInfo = () => {
          setIsLowPowerMode(battery.level <= 0.2 && !battery.charging);
        };

        updateBatteryInfo();
        battery.addEventListener('chargingchange', updateBatteryInfo);
        battery.addEventListener('levelchange', updateBatteryInfo);

        return () => {
          battery.removeEventListener('chargingchange', updateBatteryInfo);
          battery.removeEventListener('levelchange', updateBatteryInfo);
        };
      }).catch(() => {
        // 배터리 API가 지원되지 않는 경우 기본값 유지
        setIsLowPowerMode(false);
      });
    } else {
      // 배터리 API가 없는 경우 시스템 정보를 기반으로 추정
      const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      setIsLowPowerMode(!isMobile); // 모바일이 아닌 경우 저전력 모드 비활성화
    }
  }, []);

  return { isLowPowerMode, setIsLowPowerMode };
}