---
title: Plugins Store External Update Sets
---

# Plugins, ServiceNow Store, and External Update Sets Standards

### Plugins

*   Generally speaking, since some plugins affect other parts of the instance and some plugins will completely change the architecture of the instance, IET Service Management should be contacted to activate plugins in the Development, Test, and Production instances. 
*   Plugins are typically not reversable once installed, so use caution and review the dependencies before activating.
*   Plugin activations in sub-production instances can be requested here https://ucdavisit.service-now.com/servicehub/?id=ucd_cat_item&sys_id=296c901d134b6b003527bd122244b087

### ServiceNow Store

*   Only users with ServiceNow HI accounts are able to request entitlements from the ServiceNow Store.
*   If your department does not have a HI representive, contact IET Service Management for assistance.

### External Update Sets

*   The UC Davis ServiceNow instances contain sensitive information and therefore external update sets should be implemented with caution.
*   Fully review every update within the update set to ensure that the intended functionality and only the intended functionality is part of the update.
*   Do not implement external update sets if they look like they may affect other developers work negatively or if they would turn off functionality that is currently in-use in some way by another area in the instance.
*   Do not implement update sets that requires outside connections to unknown sources.
