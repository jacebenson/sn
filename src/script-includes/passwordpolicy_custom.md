---
title: "PasswordPolicy_Custom"
id: "passwordpolicy_custom"
---

API Name: global.PasswordPolicy_Custom

```js
gs.include("PrototypeServer");
var PasswordPolicy_Custom = Class.create();
PasswordPolicy_Custom.prototype = {
    initialize: function() {
        this.customOptions = {
            minimun_password_length: 8,
            maximum_password_length: 40,
            minimum_uppercase_characters: 1,
            minimum_lowercase_characters: 1,
            minimum_numeric_characters: 1,
            minimum_special_characters: 0
        };
    },
    process: function() {
        // WRITE YOUR CODE TO CHANGE customOptions
        return this.isCustomOptionsValid() ? this.customOptions : {};
    },
    // DO NOT MODIFY THIS VALIDATION METHOD
    isCustomOptionsValid: function() {
        if (this.customOptions && Object.keys(this.customOptions).length > 0) {
            for (x in this.customOptions) {
                if (isNaN(this.customOptions[x])) {
                    gs.addErrorMessage(x + " is not a number = " + this.customOptions[x]);
                    return false;
                }
            }
        }
        return true;
    },
    type: 'PasswordPolicy_Custom'
};
```