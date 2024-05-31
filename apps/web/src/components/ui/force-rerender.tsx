import { PropsWithChildren, useEffect, useState } from "react";

export function ForceRerender(props: PropsWithChildren) {
  const [_, forceRerenderMod] = useState(0);

  useEffect(() => {
    const interval = setInterval(
      () => forceRerenderMod((prev) => (prev + 1) % 2),
      2000,
    );
    return () => {
      clearInterval(interval);
    };
  }, []);

  return props.children;
}
