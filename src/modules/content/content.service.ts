import { ModelCrudService } from "@/lib/crud/model-crud.service";
import { contentRepositories } from "@/modules/content/content.repository";

export const contentCrudServices = {
  pages: new ModelCrudService("Page", contentRepositories.pages, {
    createdAt: -1,
  }),
  banners: new ModelCrudService("Banner", contentRepositories.banners, {
    sortOrder: 1,
    bannerName: 1,
  }),
  navigationMenus: new ModelCrudService(
    "Navigation menu",
    contentRepositories.navigationMenus,
    { menuName: 1 },
  ),
  navigationMenuItems: new ModelCrudService(
    "Navigation menu item",
    contentRepositories.navigationMenuItems,
    { sortOrder: 1, label: 1 },
  ),
  notifications: new ModelCrudService(
    "Notification",
    contentRepositories.notifications,
    { sentAt: -1 },
  ),
  analyticsEvents: new ModelCrudService(
    "Analytics event",
    contentRepositories.analyticsEvents,
    { createdAt: -1 },
  ),
  auditLogs: new ModelCrudService("Audit log", contentRepositories.auditLogs, {
    createdAt: -1,
  }),
};
