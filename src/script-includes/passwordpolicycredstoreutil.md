---
title: "PasswordPolicyCredStoreUtil"
id: "passwordpolicycredstoreutil"
---

API Name: global.PasswordPolicyCredStoreUtil

```js
var PasswordPolicyCredStoreUtil = Class.create();
PasswordPolicyCredStoreUtil.prototype = Object.extendsObject(AbstractAjaxProcessor, {
    /**
     * This function makes this AJAX public. By default, all AJAX server side is private.
     */
    isPublic: function() {
        return true;
    },

    getStrengthCalculationRegexPerPasswordPolicy: function(passwordPolicyGR) {
        var defaultRegex = /^(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).{8,40}$/;
        if (passwordPolicyGR.isValid()) {
            var regexStr = "";
            var ppMinLen = passwordPolicyGR.getValue("minimun_password_length");
            var ppMaxLen = passwordPolicyGR.getValue("maximum_password_length");
            var minLowerCase = passwordPolicyGR.getValue("minimum_lowercase_characters");
            var minUpperCase = passwordPolicyGR.getValue("minimum_uppercase_characters");
            var minNumeric = passwordPolicyGR.getValue("minimum_numeric_characters");
            var minSpecialChar = passwordPolicyGR.getValue("minimum_special_characters");

            var policyScript;
            if (passwordPolicyGR.isValidField('password_policy_script')) {
                policyScript = passwordPolicyGR.password_policy_script;
            }
            var options = eval(policyScript);
            if (options) {
                if (options['minimun_password_length'])
                    ppMinLen = options['minimun_password_length'];
                if (options['maximum_password_length'])
                    ppMaxLen = options['maximum_password_length'];
                if (options['minimum_uppercase_characters'])
                    minUpperCase = options['minimum_uppercase_characters'];
                if (options['minimum_lowercase_characters'])
                    minLowerCase = options['minimum_lowercase_characters'];
                if (options['minimum_numeric_characters'])
                    minNumeric = options['minimum_numeric_characters'];
                if (options['minimum_special_characters'])
                    minSpecialChar = options['minimum_special_characters'];
            }

            var lowerCaseRegex = "";
            var upperCaseRegex = "";
            var numericRegex = "";
            var specialCharRegex = "";

            if (minLowerCase >= 0) {
                lowerCaseRegex = "(?=(.*[a-z]){" + minLowerCase + "})";
            }

            if (minUpperCase >= 0) {
                upperCaseRegex = "(?=(.*[A-Z]){" + minUpperCase + "})";
            }

            if (minNumeric >= 0) {
                numericRegex = "(?=(.*\\d){" + minNumeric + "})";
            }

            if (minSpecialChar >= 0) {
                var specialChars = this.getSpecialChars(passwordPolicyGR.getValue("whitelisted_special_characters"));
                specialCharRegex = "(?=(.*[" + specialChars + "]){" + minSpecialChar + "})";
            }

            regexStr = "^" + numericRegex + lowerCaseRegex + upperCaseRegex + specialCharRegex + ".{" + ppMinLen + "," + ppMaxLen + "}$";

            return new RegExp(regexStr);
        }
        return defaultRegex;
    },

    getSpecialChars: function(whitelistedSpecialCharacters) {
        var specialChars = "^a-zA-Z0-9";
        if (whitelistedSpecialCharacters) {
            specialChars = whitelistedSpecialCharacters;
            // Escape Regex specific character which have special meaning in Regular expressions.
            // Escape '-'
            specialChars = specialChars.replace(/-/g, '\\-');
            // Escape '['
            specialChars = specialChars.replace(/\[/g, '\\[');
            // Escape ']'
            specialChars = specialChars.replace(/]/g, '\\]');
        }
        return specialChars;
    },

    getStrengthRuleScript: function(passwordPolicyGR) {
        var strengthCalRegex = this.getStrengthCalculationRegexPerPasswordPolicy(passwordPolicyGR);
        var strengthRuleScript = "// This (client) script is invoked during the password reset and password change steps.\n" +
            "// It is used to calculate the strength of the new password.\n" +
            "// The return value should be between 0 and 100, inclusive. \n" +
            "\n" +
            "function calculatePasswordStrength(password) {\n" +
            "    // Return 0 if password is not valid:\n" +
            "    var regex = " +
            strengthCalRegex +
            ";\n" +
            "    if (!regex.test(password)) {\n" +
            "        return 0;\n" +
            "    }\n" +
            "\n" +
            "    // Start with a score of 25 (weak password):\n" +
            "    var strength = 25;\n" +
            "\n" +
            "    // Award points for every character after the 8th:\n" +
            "    strength += 5 * (Math.max(password.length, 8) - 8);\n" +
            "\n" +
            "    // Count number of unique characters:\n" +
            "    var uniqueCount = 0;\n" +
            "    var charMap = {};\n" +
            "    for (var i = 0; i < password.length; i++) {\n" +
            "        if (charMap[password[i]] == undefined)\n" +
            "            uniqueCount++;\n" +
            "        charMap[password[i]] = true;\n" +
            "    }\n" +
            "\n" +
            "    // Award points for every unique caracter after the 4th character:\n" +
            "    strength += 10 * (Math.max(uniqueCount, 4) - 4);\n" +
            "\n" +
            "    // Search for 3 similar, accending or decending characters in sequence:\n" +
            "    var countSimilar = 0;\n" +
            "    var countAscending = 0;\n" +
            "    var countDecending = 0;\n" +
            "    for (var j = 0; j < password.length - 2; j++) {\n" +
            "        if ((password[j] == password[j + 1]) && (password[j + 1] == password[j + 2]))\n" +
            "            countSimilar++;\n" +
            "        if ((password.charCodeAt(j) == (password.charCodeAt(j + 1) + 1)) && (password.charCodeAt(j + 1) == (password.charCodeAt(j + 2) + 1)))\n" +
            "            countAscending++;\n" +
            "        if ((password.charCodeAt(j) == (password.charCodeAt(j + 1) - 1)) && (password.charCodeAt(j + 1) == (password.charCodeAt(j + 2) - 1)))\n" +
            "            countDecending++;\n" +
            "    }\n" +
            "\n" +
            "    // Reduce points for using 3 similar, ascending or decending characters in sequence:\n" +
            "    strength -= 5 * (countSimilar + countAscending + countDecending);\n" +
            "\n" +
            "    // Award points for use of 2 or more special characters:\n" +
            "    if (/(.*\\W){2,}/.test(password))\n" +
            "        strength += 20;\n" +
            "\n" +
            "    // Always return a value between 25 (weak) and 100 (strong):\n" +
            "    return Math.min(100, Math.max(25, strength));\n" +
            "}";

        return strengthRuleScript;
    },

    getPasswordLengthSysProperty: function() {
        return gs.getProperty("set.password.length");
    },

    type: 'PasswordPolicyCredStoreUtil'
});
```