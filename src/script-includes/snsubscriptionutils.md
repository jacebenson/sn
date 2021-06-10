---
title: "SNSubscriptionUtils"
id: "snsubscriptionutils"
---

API Name: global.SNSubscriptionUtils

```js
var SNSubscriptionUtils = Class.create();

SNSubscriptionUtils.prototype = {
    initialize: function() {
        //Properties
        this.SUBSCRIPTION_USED_THRESHOLD = 'subscription.used.thresh';

        //Tables
        this.LICENSE_CUST_ALLOTMENT_TBL = 'license_cust_table_allotment';
        this.CUSTOM_TABLE_INVENTORY = 'ua_custom_table_inventory';

        //Fields
        this.ALLOTMENT_TYPE = 'allotment_type';
        this.SUBSCRIPTION = 'license';
        this.APPLICATION_NAME = "app_name";

        //Value constants
        this.PLAT_BUNDLE_ALLOT_TYPE = '3';
        this.PLAT_ONLY_ALLOT_TYPE = '1';
        this.GRANDFATHER_ALLOT_TYPE = '2';
        this.GRACE_PERIOD = 90;

        this.NA_COUNT_STR = 'N/A';
		this.UNLIMITED_COUNT_STR = 'Unlimited';

	this.IS_EMPTY = "ISEMPTY";

        this.ALLOCATED = 'allocated';
        this.COUNT = 'count';
        this.DATE = 'date';

        this.PLATFORM_SUBSCRIPTION = "Platform Subscription";
        this.TABLES_USED = 'tables_used';
        this.TABLES_NAME = 'table_name';
        this.TABLE_CREATED_ON = 'table_created_on';
        this.TABLE_COUNT = 'table_count';
        this.NUM_TABLES = 'num_tables';
        this.LIC_MCU = 'LICMCU';
		    this.LIC_BCU = 'LICBCU';
		    this.LIC_CCU = 'LICCCU';
    },

    isOverAlloc: function(licenseGR) {
        return this.fieldOverCompareTo(licenseGR, this.ALLOCATED, this.COUNT);
    },

    allocExceedsThresh: function(licenseGR) {
        return this.fieldExceedsThresh(licenseGR, this.ALLOCATED, this.COUNT);
    },

    isUnderThresh: function(licenseGR) {
        return this.fieldUnderThresh(licenseGR, this.ALLOCATED, this.COUNT);
    },

    tablesUsedExceedsThresh: function(licenseGR) {
        return this.fieldExceedsThresh(licenseGR, this.TABLES_USED, this.TABLE_COUNT);
    },

    tablesUsedUnderThresh: function(licenseGR) {
        return this.fieldUnderThresh(licenseGR, this.TABLES_USED, this.TABLE_COUNT);
    },

    tablesUsedOverCount: function(licenseGR) {
        return this.fieldOverCompareTo(licenseGR, this.TABLES_USED, this.TABLE_COUNT);
    },

    fieldOverCompareTo: function(licenseGR, comparingField, compareToField) {
        if (licenseGR.getValue(comparingField) == this.NA_COUNT_STR || licenseGR.getValue(comparingField) == this.UNLIMITED_COUNT_STR)
            return false;

        var comparingVal = parseInt(licenseGR.getValue(comparingField));
        var compareToVal = parseInt(licenseGR.getValue(compareToField));

        if (comparingVal > compareToVal)
            return true;

        return false;
    },

    fieldUnderThresh: function(licenseGR, comparingField, compareToField) {
        if (licenseGR.getValue(comparingField) == this.NA_COUNT_STR)
            return false;

        if (licenseGR.getValue(comparingField) == this.UNLIMITED_COUNT_STR)
            return true;

        var comparingVal = parseInt(licenseGR.getValue(comparingField));
        var compareToVal = parseInt(licenseGR.getValue(compareToField));

        if (compareToVal == 0)
            return true;

        if (compareToVal > 0 &&
            (comparingVal * 100 / compareToVal) < parseInt(gs.getProperty('subscription.used.thresh', 90)))
            return true;

        return false;
    },

    fieldExceedsThresh: function(licenseGR, comparingField, compareToField) {
        if (licenseGR.getValue(comparingField) == this.NA_COUNT_STR || licenseGR.getValue(comparingField) == this.UNLIMITED_COUNT_STR)
            return false;

        var comparingVal = parseInt(licenseGR.getValue(comparingField));
        var compareToVal = parseInt(licenseGR.getValue(compareToField));

        if (compareToVal > 0 &&
            (comparingVal * 100 / compareToVal) >= parseInt(gs.getProperty('subscription.used.thresh', 90)) &&
            comparingVal <= compareToVal)
            return true;

        return false;
    },

    getTablesUsedForLicense: function(current) {
        if (gs.nil(current) || gs.nil(current.sys_id) || current.table_count == this.NA_COUNT_STR)
            return this.NA_COUNT_STR;

        var custGA = new GlideAggregate(this.CUSTOM_TABLE_INVENTORY);
        custGA.addQuery(this.SUBSCRIPTION, current.sys_id);
        custGA.addAggregate('COUNT');
        custGA.query();

        if (custGA.next())
            return custGA.getAggregate('COUNT');

        return 0;
    },

    getValidTablesByAllotment: function(licenseSysId) {
        if (JSUtil.nil(licenseSysId))
            return null;

        var allotGR = new GlideRecord(this.LICENSE_CUST_ALLOTMENT_TBL);
        allotGR.addQuery(this.SUBSCRIPTION, licenseSysId);
        allotGR.query();

        if (allotGR.next()) {
	    var customTables = [];
            
	    var custGA = new GlideRecord(this.CUSTOM_TABLE_INVENTORY);
            
	    custGA.addQuery(this.SUBSCRIPTION, this.IS_EMPTY, "")
                .addOrCondition(this.ALLOTMENT_TYPE, this.PLAT_ONLY_ALLOT_TYPE);
            custGA.query();

            while (custGA.next()) {
                customTables.push(custGA.getUniqueValue());
	    }
           
	    return customTables.join();
        } else
            return null;
    },

    getValidCustomAppsByAllotment: function(licenseSysId) {
        if (JSUtil.nil(licenseSysId))
            return null;

        var allotGR = new GlideRecord(this.LICENSE_CUST_ALLOTMENT_TBL);
        allotGR.addQuery(this.SUBSCRIPTION, licenseSysId);
        allotGR.query();

        if (allotGR.next()) {

            var customApps = [];

            var custGA = new GlideAggregate(this.CUSTOM_TABLE_INVENTORY);
            custGA.addQuery(this.SUBSCRIPTION, "ISEMPTY")
                .addOrCondition(this.ALLOTMENT_TYPE, this.PLAT_ONLY_ALLOT_TYPE);
            custGA.groupBy(this.APPLICATION_NAME);
            custGA.query();

            while (custGA.next()) {
                if (custGA.getValue("app_name") != "global")
                    customApps.push(custGA.getValue("app_name"));
            }

            return customApps.join();
        } else
            return null;
    },

    getAllotmentType: function(license) {
        if (JSUtil.nil(licenseSysId))
            return null;

        var allotGR = new GlideRecord(this.LICENSE_CUST_ALLOTMENT_TBL);
        allotGR.addQuery(this.SUBSCRIPTION, licenseSysId);
        allotGR.query();

        if (allotGR.next())
            return allotGR.getValue(this.ALLOTMENT_TYPE);
        else
            return null;
    },

    getValidSubscriptionsForCustTblMapping: function() {
        var validSubscSysIds = [];

        var allotGR = new GlideRecord(this.LICENSE_CUST_ALLOTMENT_TBL);
        allotGR.query();
        while (allotGR.next()) {
            var license = new GlideRecord('license_details');
            license.setWorkflow(false);
            if (license.get(allotGR.getValue('license'))) {

                var endDate = new GlideDateTime(license.end_date);
                endDate.addDays(this.GRACE_PERIOD);
                if (endDate > gs.endOfToday())
                    validSubscSysIds.push(allotGR.getValue(this.SUBSCRIPTION));
            }
        }
        return 'sys_idIN' + validSubscSysIds.toString();

    },

	
	isSubscriptionValidToMap: function(current, previous) {
		var errMsg;
		
		if (previous.allotment_type == this.GRANDFATHER_ALLOT_TYPE) { //of grandfather, then cannot unmap
			gs.addErrorMessage(gs.getMessage("Once added, tables cannot be removed from a {0} subscription", previous.license.getDisplayValue()));
			return this._abortAction(current);
		}

		this.mapSubscription(current);
	},

	mapSubscription: function (current) {
		if (gs.nil(current.license)) {
			current.allotment_type = "";
		} else {
			var allotGR = new GlideRecord(this.LICENSE_CUST_ALLOTMENT_TBL);
			allotGR.addQuery(this.SUBSCRIPTION, current.license);
			allotGR.query();
			
			if (allotGR.next()) {
				
				if (allotGR.getValue(this.ALLOTMENT_TYPE) == this.GRANDFATHER_ALLOT_TYPE) {
					var numTables = allotGR.getValue(this.NUM_TABLES);

					if (current.app_name == "Global") {
                        var customTableGR = new GlideRecord(this.CUSTOM_TABLE_INVENTORY);
                        customTableGR.addQuery(this.SUBSCRIPTION, allotGR.getValue(this.SUBSCRIPTION));
                        customTableGR.query();
                        var customTablesMapped = customTableGR.getRowCount();

                        if (customTablesMapped >= numTables) {
                            gs.addErrorMessage(gs.getMessage("Additional table cannot be added to {0} once the table limit has been reached", allotGR.getDisplayValue(this.SUBSCRIPTION)));
                            return this._abortAction(current);
                        }
                    } else {
                        var otherGR = new GlideRecord(this.CUSTOM_TABLE_INVENTORY);
                        otherGR.addQuery(this.SUBSCRIPTION, allotGR.getValue(this.SUBSCRIPTION));
                        otherGR.addQuery(this.APPLICATION_NAME, "!=", current.app_name);
                        otherGR.query();
                        var otherMapped = otherGR.getRowCount();

                        var appGR = new GlideRecord(this.CUSTOM_TABLE_INVENTORY);
                        appGR.addQuery(this.APPLICATION_NAME, current.app_name);
                        appGR.query();
                        var appCount = appGR.getRowCount();

                        if (otherMapped + appCount > numTables) {
                            gs.addErrorMessage(gs.getMessage("Table allocation cannot exceed the available number of tables.  All tables within the same application must be entitled to the same subscription."));
                            return this._abortAction(current);
                        }
                    }
				}
				
				current.allotment_type = allotGR.getValue(this.ALLOTMENT_TYPE);
			}
		}
	},
	
	_abortAction: function(current) {
		current.setAbortAction(true);
	},
	
	getAllocationOrDate: function(current, type) {
		if (type == this.COUNT)
			return this._getAllocationCount(current);
		else
			return this._getLastCalcDate(current);
	},
	
	_getAllocationCount: function(current) {
		if (current.license_type == 0) { // per-user
			var ga = new GlideAggregate('sys_user_has_license'); 
			ga.addQuery('license', current.sys_id); 
			ga.addQuery('user.active', 1); 
			ga.addAggregate('COUNT');
			ga.query(); 
			if (ga.next())
				return ga.getAggregate('COUNT'); 
			
			return 0;
		} else if (current.license_type == 1 || current.license_type == 2) // capacity or max-user 
			return SNC.UsageAnalyticsScriptUtils.calculateAllocation(current.quota_defn_id, current.quota_id);
		  else if (current.license_type == 3 || current.license_type == 4 || current.license_type == 5) // un-limited || pa-indicator || display
			return "N/A";
	},
	
	_getLastCalcDate: function(current) {
		
		var isIhType = SNC.UsageAnalyticsScriptUtils.isLicenseIHType(current.license_id);
		if (isIhType) 
			return this._getUsageAnalyticsCount(current, this.LIC_MCU, 'sys_created_on');
		
		if (current.license_type == 1 || current.license_type == 2) // capacity or max-user
			return SNC.UsageAnalyticsScriptUtils.calculateLastCalculatedDate(current.quota_defn_id, current.quota_id);
	},
	
	_getUsageAnalyticsCount: function(current, usageType, column) {
		var gr = new GlideRecord('usageanalytics_count'); 
		gr.addQuery('definition_id', usageType + current.license_id);
		gr.orderByDesc('time_stamp');
		gr.query();
		if (gr.next()) 
			return gr.getValue(column); 
		return "Unavailable";
	},

    type: 'SNSubscriptionUtils'
};
```