---
title: "PwdGoogleAuthEnrollmentCheck"
id: "pwdgoogleauthenrollmentcheck"
---

API Name: global.PwdGoogleAuthEnrollmentCheck

```js
var PwdGoogleAuthEnrollmentCheck = Class.create();
PwdGoogleAuthEnrollmentCheck.prototype = {
  category: 'password_reset.extension.enrollment_check',    // DO NOT REMOVE THIS LINE!

  /**********
   * Returns boolean telling whether the user is enrolled.
   * 
   * @param params.enrolledUserId The sys-id of the user being checked (table: sys_user)
   * @param params.verificationId [NOT USED] The sys-id of the verification being checked (table: pwd_verification)
   * @return boolean telling whether the user is enrolled into the specified verification
   **********/
  process: function(params) {
	  return this.isEnrolled(params.verificationId, params.enrolledUserId);
  },

  /* eslint-disable no-unused-vars */ 
  isEnrolled: function(verificationId, userId) {
	  return SNC.MultifactorAuthUtil.isValidatedForUser(userId);
  },
  /* eslint-enable */ 
  
  type: 'PwdGoogleAuthEnrollmentCheck'
};
```