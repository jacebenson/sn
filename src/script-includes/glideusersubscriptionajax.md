---
title: "GlideUserSubscriptionAjax"
id: "glideusersubscriptionajax"
---

API Name: global.GlideUserSubscriptionAjax

```js
var GlideUserSubscriptionAjax = Class.create();

GlideUserSubscriptionAjax.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	
   approvePendingForApprovalUsers: function() {
	   // Called when a single or multiple sys_user_pending_license_records are selected 
	   // and Allocate UI action is invoked
	   var pendingLicSysIDsStr = this.getParameter('sysparm_approve_users_sysIDs');
	   
	   if (JSUtil.nil(pendingLicSysIDsStr))
		   return;
	   
	   var pendingLicSysIDs = pendingLicSysIDsStr.split(',');
	  
	   for(var index = 0; index < pendingLicSysIDs.length; index++) {
		   this.userSubscriptionHelper.movePendingUserHasLicenseRecToSubscribed(pendingLicSysIDs[index]);
	   }  
   },
	
	removeAndExcludeUserFromLicense: function() {
            // Input is the sys_ids of the sys_user_has_license_records
              var excludedUserHasLicenseSysIDsStr = this.getParameter('sysparm_exclude_users_sysIDs');
              
              if (JSUtil.nil(excludedUserHasLicenseSysIDsStr))
                      return;
              
              var excludedUsersSysIDs = excludedUserHasLicenseSysIDsStr.split(',');
              
              for(var index = 0; index < excludedUsersSysIDs.length; index++) {
                      var userLicGR = this._retrieveUserLicenseGR(excludedUsersSysIDs[index]);
                    
                      if (!userLicGR.isValidRecord())
                              continue;
                    
                    this.userSubscriptionHelper.removeAndExcludeUserFromLicense(userLicGR.getValue('user'), userLicGR.getValue('license'));
            }
            
    },
    
	removeAndExcludeUserFromPendingLicense: function() {
       // Input is the sys_ids of the sys_user_pending_license records
         var excludedUserHasLicenseSysIDsStr = this.getParameter('sysparm_exclude_users_sysIDs');
         if (JSUtil.nil(excludedUserHasLicenseSysIDsStr))
                 return;
         
         var excludedUsersSysIDs = excludedUserHasLicenseSysIDsStr.split(',');
         
         for(var index = 0; index < excludedUsersSysIDs.length; index++) {
                 var userLicGR = this._retrieveUserLicenseGRForGivenTable(excludedUsersSysIDs[index], 'sys_user_pending_license');
               
                 if (!userLicGR.isValidRecord())
                         continue;
               this.userSubscriptionHelper.removeAndExcludeUserFromPendingLicense(userLicGR.getValue('user'), userLicGR.getValue('license'));
       }	            
   }, 
         
    _retrieveUserLicenseGR: function(userLicSysID) {
            var userLicenseGR = new GlideRecord('sys_user_has_license');
            
            if (JSUtil.nil(userLicSysID))
                    return userLicenseGR;
            
            userLicenseGR.get(userLicSysID);
            
            return userLicenseGR;
           
    },
    
  	_retrieveUserLicenseGRForGivenTable: function(userLicSysID, tableName) {
          var userLicenseGR = new GlideRecord(tableName);
          
          if (JSUtil.nil(userLicSysID))
                  return userLicenseGR;
          
          userLicenseGR.get(userLicSysID);
          
          return userLicenseGR;
  	},
	
	
	syncALicense: function() {
		var retJSON = {};
		var licenseSysID = this.getParameter('sysparm_license_sysID');
		if (JSUtil.nil(licenseSysID)) {
			retJSON.syncStatus = 'failure';
			return new JSON().encode(retJSON);
		} 
		
		var licenseGR = new GlideRecord('license_details');
		licenseGR.get(licenseSysID);
		
		var syncHelper = new UserSetSubscriptionSyncHelper();
		var gr = syncHelper._getUserSetsForLicense(licenseSysID);
		if (gr != null && gr.getRowCount() == 0) {
			retJSON.syncStatus = "nosync";
			return new JSON().encode(retJSON);
		}
		
		retJSON = syncHelper.syncLicense(licenseGR);
		
		return new JSON().encode(retJSON);
	},
	
	getDashboardLink: function() {
		var license_sys_id = this.getParameter('sysparm_license_sys_id');
		var dashboardLink = SNC.UsageAnalyticsScriptUtils.getLicenseDashboardLink(license_sys_id);
		return dashboardLink;
	},
	
	_getUserRoleCT: function() {
		var userRoleCT = [];
		var sysIds = this.getParameter("sysparm_ua_user_role_ct_sys_ids");
		var gr = new GlideRecord('ua_user_role_ct');
		gr.addQuery('sys_id', 'IN', sysIds);
		gr.query();
		var userSysId;
		while(gr.next()) {			
			var roleRef = gr.getValue('role_ref');
			userRoleCT.push(roleRef);
			if(gs.nil(userSysId)) {
				userSysId = gr.getValue('user');
			} 
		}
		var userAndUserRoleCT = {
			userSysId: userSysId,
			userRoleCTList: userRoleCT
		};
		
		return userAndUserRoleCT;
	},
	
	getUserRoles: function() {
		var userRoleCT = this._getUserRoleCT();		
		var userHasRoleGR = new GlideRecord('sys_user_has_role');
		userHasRoleGR.addQuery('role', 'IN', userRoleCT.userRoleCTList);
		userHasRoleGR.addQuery('user', userRoleCT.userSysId);
		var rolesNotInherited = [];
		var rolesInherited = [];
		userHasRoleGR.query();
		
		while(userHasRoleGR.next()) {
			if(userHasRoleGR.inherited == true) {
				rolesInherited.push(userHasRoleGR.sys_id);
			} else {
				rolesNotInherited.push(userHasRoleGR.sys_id);
			}
		}

		var r = JSON.stringify({rolesInherited: rolesInherited + '', rolesNotInherited: rolesNotInherited + ''});
		return r;
	},
	
	checkAndAllocatePendingUsers: function() {
			// api, checks if to be allocated users are more than slots availabe for the subscription.
			// if check fails, we do not directly allocate users to subscription, but wait for a confirmation
		var retJSON = {};
		
		var pendingUsersSysIDs = this.getParameter('sysparm_pending_users_sysIDs').split(',');
		
		if (pendingUsersSysIDs.length > 0) {
			var exceedsLimit =  this.userSubscriptionHelper.doesAddingAListOfUsersExceedPurchasedLimit(pendingUsersSysIDs, this.getParameter('sysparm_licenseSysId'));
		
			if (exceedsLimit)
				retJSON.isAdded = false;
			else  {
			
			   for(var index = 0; index < pendingUsersSysIDs.length; index++) {
				   this.userSubscriptionHelper.movePendingUserHasLicenseRecToSubscribed(pendingUsersSysIDs[index]);
			   } 
			   
			   var msgArgs = [];
			   msgArgs.push(pendingUsersSysIDs.length);
			   retJSON.numAddedMsg = gs.getMessage("{0} user(s) were allocated to the subscription", msgArgs);
			   retJSON.isAdded = true;
			}
		}		
		return new JSON().encode(retJSON);
	},
	
	userSubscriptionHelper: new UserSubscriptionHelper()
});	
```