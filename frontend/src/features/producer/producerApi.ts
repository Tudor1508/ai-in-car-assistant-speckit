import { ApiClientError, apiRequest } from "@/lib/api/client";
import type { ProducerReport } from "./producerTypes";

export async function getProducerReport(): Promise<ProducerReport> {
  try {
    return await apiRequest<ProducerReport>("/producer/report");
  } catch (error) {
    if (error instanceof ApiClientError && error.code === "producer_brand_not_configured") {
      throw new Error("A brand has not been configured for this Producer account. Contact an administrator.");
    }
    if (error instanceof ApiClientError && error.code === "authentication_required") {
      throw new Error("Your session has expired. Please sign in again.");
    }
    if (error instanceof ApiClientError) {
      throw new Error(error.message || "The Producer report could not be loaded. Please try again.");
    }
    throw new Error("The Producer report could not be loaded. Check your connection and try again.");
  }
}
