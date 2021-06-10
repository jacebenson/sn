---
title: "AssetUtilsAJAX"
id: "assetutilsajax"
---

API Name: global.AssetUtilsAJAX

```js
var AssetUtilsAJAX = Class.create();
AssetUtilsAJAX.prototype = Object.extendsObject(AbstractAjaxProcessor, {

    isSerialNumberMandatory: function() {
        if (gs.getProperty('glide.asset.create_ci_with_ire') === 'true') {
            var modelCategory = this.getParameter('sysparm_model_category');
            var tableName = this.getParameter('sysparm_table_name');
            if (tableName != 'alm_consumable' && tableName != 'alm_license') {
                var modelCategoryGr = new GlideRecord('cmdb_model_category');
                if (modelCategoryGr.get(modelCategory)) {
                    var ciClass = modelCategoryGr.cmdb_ci_class;
                    if (!gs.nil(ciClass)) {
                        var res = SNC.CmdbMetadataScriptableApi.hasSerialNumberRuleWithNoRelationship(ciClass);
                        return res;
                    }
                }
            }
        }
        return false;
    },

    getQuantity: function() {
        var model = this.getParameter('sysparm_model');
        var stockroom = this.getParameter('sysparm_stockroom');
        return (new AssetUtils()).getAvailableQuantity(model, stockroom);
    },

    needMore: function() {
        var model = this.getParameter('sysparm_model');
        return (new AssetUtils()).getStockRooms(model).toString();

    },

    findVendor: function() {
        var model = this.getParameter('sysparm_model');
        return (new AssetUtils()).getVendors(model).toString();
    },

    mergeLicenses: function() {
        return (new AssetUtils()).mergeLicenses(this.getParameter('sysparm_licenseId'));
    },

    shouldMakeStatusSubstatusReadonly: function () {
		var result = {
			install_status: false,
			substatus: false,
		};
		var assetGr = new GlideRecord('alm_asset');
		assetGr.addQuery('sys_id', this.getParameter('sysparm_asset'));
		assetGr.query();
		if (assetGr.next()) {
			// Check disposal order number
			if (GlidePluginManager.isActive('com.sn_hamp')) {
				var out = new sn_hamp.HampHWDisposalUtils().shouldMarkFieldsReadOnly(assetGr);
				result.install_status = out.install_status;
				result.substatus = out.substatus;
			}
			if (!result.install_status || !result.substatus) {
				// Check if marked for disposal
				if (assetGr.getValue('sys_class_name') === 'alm_consumable') {
					var consumableGr = new GlideRecord('alm_consumable');
					consumableGr.get(assetGr.getUniqueValue());
					if (consumableGr.getValue('planned_for_disposal') === '1') {
						result.install_status = true;
						result.substatus = true;
					}
				}
			}
			if (!result.substatus) {
				var status = assetGr.getValue('install_status');
				if (status === '10' || status === '2' || status === '3' || status === '1') {
					result.substatus = true;
				}
			}
		}
		return JSON.stringify(result);
	},

	isDomainDataSeparationEnabled: function() {
		return GlideDomainSupport.isDataSeparationEnabled();
	},
});
```