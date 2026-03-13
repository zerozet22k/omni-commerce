import { ModelCrudRepository } from "@/lib/crud/model-crud.repository";
import {
  AnalyticsEventModel,
  AuditLogModel,
  BannerModel,
  NavigationMenuItemModel,
  NavigationMenuModel,
  NotificationModel,
  PageModel,
} from "@/modules/content/content.models";

export const contentRepositories = {
  pages: new ModelCrudRepository(PageModel),
  banners: new ModelCrudRepository(BannerModel),
  navigationMenus: new ModelCrudRepository(NavigationMenuModel),
  navigationMenuItems: new ModelCrudRepository(NavigationMenuItemModel),
  notifications: new ModelCrudRepository(NotificationModel),
  analyticsEvents: new ModelCrudRepository(AnalyticsEventModel),
  auditLogs: new ModelCrudRepository(AuditLogModel),
};
