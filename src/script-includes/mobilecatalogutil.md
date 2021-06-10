---
title: "MobileCatalogUtil"
id: "mobilecatalogutil"
---

API Name: sn_scmobile.MobileCatalogUtil

```js
var MobileCatalogUtil = Class.create();
MobileCatalogUtil.prototype = {
    initialize: function() {
    },
	
	getCatalogsInPortal: function(portalName) {
		
		if (gs.nil(portalName))
			return {
				value:'',
				displayValue:''
			};
		
		var catalogIDs = [];
		var catalogDisplayNames = [];
		
		var m2mGR = new GlideRecord('m2m_sp_portal_catalog');
		if (m2mGR.isValid()) {
			m2mGR.addActiveQuery();
			m2mGR.addQuery('sp_portal.url_suffix', portalName);
			m2mGR.addQuery('sc_catalog.active', true);
			m2mGR.orderBy('order');
			m2mGR.orderBy('sc_catalog.title');
		}//For old database
		else {
			m2mGR = new GlideRecord('sp_portal');
			m2mGR.addQuery('url_suffix', portalName);
		}
		m2mGR.query();
		
		if (m2mGR.getRowCount() > 0) {
			while(m2mGR.next()) {
				catalogIDs.push(m2mGR.getValue('sc_catalog'));
				catalogDisplayNames.push(m2mGR.getDisplayValue('sc_catalog'));
			}
		} else {
			var catalogGR = new GlideRecord('sc_catalog');
			catalogGR.addActiveQuery();
			catalogGR.addQuery('sys_id', "!=", '0b22fd2ad7021100b9a5c7400e610319');	// Hide Admin Catalog
			catalogGR.orderBy('title');
			catalogGR.query();
			while (catalogGR.next()) {
				catalogIDs.push(catalogGR.getUniqueValue());
				catalogDisplayNames.push(catalogGR.getDisplayValue());
			}
		}
		return {
			value: catalogIDs.join(','),
			displayValue: catalogDisplayNames.join(',')
		};
	},
	
	getCatalogItemTypeNotSupported: function() {
		if (gs.getProperty('glide.sc.mobile.unsupported_discover', 'discover') == 'discover')
			return 'sc_cat_item_wizard';
		
		return 'sc_cat_item_wizard,' + gs.getProperty('glide.sc.mobile.item_class_not_supported');
	},
	
	getItemAvailability: function() {
		if (gs.getProperty('glide.sc.mobile.unsupported_discover', 'discover') == 'discover')
			return "on_desktop,on_mobile,on_both";
		
		if (gs.getProperty('glide.sc.mobile.include_desktop_only_items', 'true') == 'false')
			return "on_mobile,on_both";

		return "on_desktop,on_mobile,on_both";
	},
	
	type: 'MobileCatalogUtil'
};
```