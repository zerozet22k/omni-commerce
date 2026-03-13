import { AppError } from "@/lib/errors/app-error";
import { assertObjectId } from "@/lib/utils/object-id";
import { CoreRepository } from "@/modules/core/core.repository";

export class CoreService {
  constructor(private readonly coreRepository = new CoreRepository()) {}

  async listCountries() {
    return this.coreRepository.listCountries();
  }

  async createCountry(input: {
    countryName: string;
    isoCode?: string;
    phoneCode?: string;
  }) {
    return this.coreRepository.createCountry(input);
  }

  async listStateRegions(countryId?: string) {
    if (countryId) {
      assertObjectId(countryId, "country id");
    }

    return this.coreRepository.listStateRegions(countryId);
  }

  async createStateRegion(input: {
    countryId: string;
    stateRegionName: string;
    code?: string;
  }) {
    assertObjectId(input.countryId, "country id");
    const country = await this.coreRepository.findCountryById(input.countryId);

    if (!country) {
      throw new AppError("Country not found.", 404);
    }

    return this.coreRepository.createStateRegion(input);
  }

  async createMediaAsset(input: {
    assetType?: "IMAGE" | "VIDEO" | "FILE";
    url: string;
    altText?: string;
    title?: string;
    mimeType?: string;
    width?: number;
    height?: number;
    durationSec?: number;
    sizeBytes?: number;
  }) {
    return this.coreRepository.createMediaAsset(input);
  }

  async getStoreSettings() {
    return this.coreRepository.getStoreSettings();
  }

  async upsertStoreSettings(input: {
    storeName: string;
    storeSlug: string;
    storeEmail?: string;
    storePhone?: string;
    supportEmail?: string;
    supportPhone?: string;
    currencyCode?: string;
    locale?: string;
    timezone?: string;
    logoAssetId?: string;
    faviconAssetId?: string;
    heroAssetId?: string;
    allowGuestCheckout?: boolean;
    stockPolicy?: "BLOCK_ON_ZERO" | "ALLOW_BACKORDER";
    orderAutoCancelMinutes?: number;
    reviewAutoPublish?: boolean;
    maintenanceMode?: boolean;
    isActive?: boolean;
  }) {
    for (const [key, value] of Object.entries({
      logoAssetId: input.logoAssetId,
      faviconAssetId: input.faviconAssetId,
      heroAssetId: input.heroAssetId,
    })) {
      if (value) {
        assertObjectId(value, key);
      }
    }

    return this.coreRepository.upsertStoreSettings(input);
  }
}

export const coreService = new CoreService();
