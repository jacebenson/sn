---
title: Client Script Standards
---

# Client Script Standards
* Use Client Scripts to validate user input
* When possible, use a UI Policy to set field attributes to mandatory, read-only, or visible rather than a Client Script
* Do not create Global Client Scripts, instead create them on Base Tables.  If needed on all child/extended table, check `inherited`
* If possible, avoid DOM Manipulation
* Do not use `GlideRecord` in Client Scripts, use `GlideAjax` instead
* Before you commit, remove console logging and alerts
* If creating Client Scripts for Catalog Items, ensure that it works in the Service Portal
