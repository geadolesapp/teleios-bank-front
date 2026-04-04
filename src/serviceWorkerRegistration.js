export function register() {
  if (process.env.NODE_ENV !== "production") return;

  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        const registration = await navigator.serviceWorker.register(
          `${process.env.PUBLIC_URL}/service-worker.js`,
        );

        console.log("Service Worker registrado com sucesso:", registration);

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;

          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              newWorker.postMessage({ type: "SKIP_WAITING" });
            }
          });
        });

        navigator.serviceWorker.addEventListener("controllerchange", () => {
          window.location.reload();
        });
      } catch (error) {
        console.error("Erro ao registrar o Service Worker:", error);
      }
    });
  }
}

export async function unregister() {
  if ("serviceWorker" in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();

      await Promise.all(
        registrations.map((registration) => registration.unregister()),
      );
    } catch (error) {
      console.error("Erro ao remover Service Worker:", error);
    }
  }
}
