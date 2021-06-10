---
title: "PasswordPolicyUtil"
id: "passwordpolicyutil"
---

API Name: global.PasswordPolicyUtil

```js
var PasswordPolicyUtil = Class.create();
PasswordPolicyUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    setPasswordPolicy: function(strength) {
        var passwordPolicyGR = new GlideRecord("password_policy");
        if (passwordPolicyGR.isValid()) {
            passwordPolicyGR.get("3054afe6737a3300616ca9843cf6a735");
            if ("high" == strength) {
                this.setHighStrengthPasswordPolicy(passwordPolicyGR);
            }
            if ("medium" == strength) {
                this.setMediumStrengthPasswordPolicy(passwordPolicyGR);
            }
            passwordPolicyGR.update();
        }
    },

    setMediumStrengthPasswordPolicy: function(policyGR) {
        policyGR.setValue('minimum_uppercase_characters', PasswordPolicyDefaults.medium_defaults.minimum_uppercase_characters);
        policyGR.setValue('minimum_lowercase_characters', PasswordPolicyDefaults.medium_defaults.minimum_lowercase_characters);
        policyGR.setValue('minimum_numeric_characters', PasswordPolicyDefaults.medium_defaults.minimum_numeric_characters);
        policyGR.setValue('minimum_special_characters', PasswordPolicyDefaults.medium_defaults.minimum_special_characters);
        policyGR.setValue('password_strength', 20);
    },

    setHighStrengthPasswordPolicy: function(policyGR) {
        policyGR.setValue('minimum_uppercase_characters', PasswordPolicyDefaults.high_defaults.minimum_uppercase_characters);
        policyGR.setValue('minimum_lowercase_characters', PasswordPolicyDefaults.high_defaults.minimum_lowercase_characters);
        policyGR.setValue('minimum_numeric_characters', PasswordPolicyDefaults.high_defaults.minimum_numeric_characters);
        policyGR.setValue('minimum_special_characters', PasswordPolicyDefaults.high_defaults.minimum_special_characters);
        policyGR.setValue('password_strength', 30);

    },

    getPasswordPolicy: function() {
        var passwordPolicyGR = new GlideRecord("password_policy");
        if (passwordPolicyGR.isValid()) {
            passwordPolicyGR.get("3054afe6737a3300616ca9843cf6a735");
            var passwordStrength = passwordPolicyGR.getValue('password_strength');
            if (passwordStrength == 20) {
                return "medium";
            } else if (passwordStrength == 30) {
                return "high";
            }
        }
        return null;
    },

    getDefaultStrength: function() {
        return JSON.stringify(PasswordPolicyDefaults.default_defaults);
    },

    getMediumStrength: function() {
        return JSON.stringify(PasswordPolicyDefaults.medium_defaults);
    },

    getHighStrength: function() {
        return JSON.stringify(PasswordPolicyDefaults.high_defaults);
    },
    type: 'PasswordPolicyUtil'
});
```