---
title: "HardeningUtil"
id: "hardeningutil"
---

API Name: global.HardeningUtil

```js
var HardeningUtil = Class.create();
HardeningUtil.prototype = {
  //Enable Blacklist for Attachments
  enableBlacklist: function () {
    var gr_blacklist = new GlideRecord("sys_properties");
    if (
      !gr_blacklist.get("name", "glide.security.attachment_type.use_blacklist")
    ) {
      gr_blacklist.initialize();
      gr_blacklist.name = "glide.security.attachment_type.use_blacklist";
      gr_blacklist.type = "boolean";
      gr_blacklist.value = "true";
      gr_blacklist.insertWithReferences();
    } else {
      gs.setProperty("glide.security.attachment_type.use_blacklist", "true");
    }
  },

  //function to enable access control properties
  enableAccessControl: function (configs) {
    for (var property in configs) {
      //Performance Monitoring ACL
      if (property == "glide.security.diag_txns_acl") {
        gs.setProperty("glide.security.diag_txns_acl", "true");
      }

      //Strict IP restriction
      if (property == "glide.ip.authenticate.strict") {
        var gr_ip = new GlideRecord("sys_properties");
        if (!gr_ip.get("name", "glide.ip.authenticate.strict")) {
          gr_ip.initialize();
          gr_ip.name = "glide.ip.authenticate.strict";
          gr_ip.type = "boolean";
          gr_ip.value = "true";
          gr_ip.insertWithReferences();
        } else {
          gs.setProperty("glide.ip.authenticate.strict", "true");
        }
      }

      //Check UI Action Conditions Before Execution
      if (property == "glide.security.strict.actions") {
        gs.setProperty("glide.security.strict.actions", "true");
      }

      //Excel Request Authorization
      if (property == "glide.basicauth.required.excel") {
        gs.setProperty("glide.basicauth.required.excel", "true");
      }

      //Basic Auth : JSONv2 Requests
      if (property == "glide.basicauth.required.jsonv2") {
        gs.setProperty("glide.basicauth.required.jsonv2", "true");
      }

      //Script Request Authorization
      if (property == "glide.basicauth.required.scriptedprocessor") {
        gs.setProperty("glide.basicauth.required.scriptedprocessor", "true");
      }

      //SOAP Content Type Checking
      if (property == "glide.soap.require_content_type_xml") {
        gs.setProperty("glide.soap.require_content_type_xml", "true");
      }

      //Default Deny
      if (property == "glide.sm.default_mode") {
        gs.setProperty("glide.sm.default_mode", "deny");
      }

      //Import Request Authorization
      if (property == "glide.basicauth.required.importprocessor") {
        gs.setProperty("glide.basicauth.required.importprocessor", "true");
      }

      //Unload Request Authorization
      if (property == "glide.basicauth.required.unl") {
        gs.setProperty("glide.basicauth.required.unl", "true");
      }

      //Basic Auth : SOAP Requests
      if (property == "glide.basicauth.required.soap") {
        gs.setProperty("glide.basicauth.required.soap", "true");
      }

      //Enable ACLs to control Live Profile Details
      if (property == "glide.live_profile.details") {
        gs.setProperty("glide.live_profile.details", "ACL");
      }

      //Enabling AJAXGlideRecord ACL Checking
      if (property == "glide.script.secure.ajaxgliderecord") {
        gs.setProperty("glide.script.secure.ajaxgliderecord", "true");
      }

      //PDF Request Authorization
      if (property == "glide.basicauth.required.pdf") {
        gs.setProperty("glide.basicauth.required.pdf", "true");
      }

      //XML Request Authorization
      if (property == "glide.basicauth.required.xml") {
        gs.setProperty("glide.basicauth.required.xml", "true");
      }

      //WSDL Request Authorization
      if (property == "glide.basicauth.required.wsdl") {
        gs.setProperty("glide.basicauth.required.wsdl", "true");
      }

      //Double Check Inbound Transactions
      if (property == "glide.security.strict.updates") {
        gs.setProperty("glide.security.strict.updates", "true");
      }

      //CSV Request Authorization
      if (property == "glide.basicauth.required.csv") {
        gs.setProperty("glide.basicauth.required.csv", "true");
      }

      //RSS Request Authorization
      if (property == "glide.basicauth.required.rss") {
        gs.setProperty("glide.basicauth.required.rss", "true");
      }

      //XSD Request Authorization
      if (property == "glide.basicauth.required.xsd") {
        gs.setProperty("glide.basicauth.required.xsd", "true");
      }

      //Privacy on Client-Callable Script Includes
      if (property == "glide.script.ccsi.ispublic") {
        var gr_ccsi = new GlideRecord("sys_properties");
        if (!gr_ccsi.get("name", "glide.script.ccsi.ispublic")) {
          gr_ccsi.initialize();
          gr_ccsi.name = "glide.script.ccsi.ispublic";
          gr_ccsi.type = "boolean";
          gr_ccsi.value = "false";
          gr_ccsi.insertWithReferences();
        } else {
          gs.setProperty("glide.script.ccsi.ispublic", "false");
        }
      }
    }
  },

  //function to enable session management properties
  enableSessionManagement: function (configs) {
    for (var property in configs) {
      if (property == "glide.security.csrf.strict.validation.mode") {
        gs.setProperty("glide.security.csrf.strict.validation.mode", "true");
      }

      //Session Activity Timeout
      if (property == "glide.ui.session_timeout") {
        gs.setProperty("glide.ui.session_timeout", configs[property]);
      }

      //Enforce Strong Passwords
      if (property == "glide.enable.password_policy") {
        var gr_install = new GlideRecord("sys_properties");
        gr_install.get("name", "glide.enable.password_policy");
        gr_install.value = true;
        gr_install.update();

        if (value == "medium") {
          new PasswordPolicyUtil().setPasswordPolicy("medium");
        }
        if (value == "high") {
          new PasswordPolicyUtil().setPasswordPolicy("high");
        }
      }

      //Managing Failed Login Attempts
      if (property == "System Policy > Script Actions") {
        var vals = configs[property].split(',');
        var gr_attempts = new GlideRecord("sys_properties");
        if (vals[0] != "") {
          if (!gr_attempts.get("name", "glide.user.max_unlock_attempts")) {
            gr_attempts.initialize();
            gr_attempts.name = "glide.user.max_unlock_attempts";
            gr_attempts.type = "integer";
            gr_attempts.value = vals[0];
            gr_attempts.insertWithReferences();
          } else {
            gs.setProperty("glide.user.max_unlock_attempts", vals[0]);
          }
        }
        gr_attempts.restoreLocation();
        if (vals[1] != "") {
          if (!gr_attempts.get("name", "glide.user.unlock_timeout_in_mins")) {
            gr_attempts.initialize();
            gr_attempts.name = "glide.user.unlock_timeout_in_mins";
            gr_attempts.type = "integer";
            gr_attempts.value = vals[1];
            gr_attempts.insertWithReferences();
          } else {
            gs.setProperty("glide.user.unlock_timeout_in_mins", vals[1]);
          }
        }

        // Activate script actions
        var gr_login = new GlideRecord("sysevent_script_action");
        gr_login.addEncodedQuery(
          "sys_idIN5e5183350a0a0a0a00093b591ece409f,5e44f9bf0a0a0a0a019a6440b2137767,d92636b2975301008e00958e3b297567"
        );
        gr_login.query();
        while (gr_login.next()) {
          gr_login.active = "true";
          gr_login.update();
        }
      }

      //Remove Remember Me
      if (property == "glide.ui.forgetme") {
        gs.setProperty("glide.ui.forgetme", "true");
      }

      //Enable Multi-factor authentication
      if (property == "glide.authenticate.multifactor") {
        gs.setProperty("glide.authenticate.multifactor", "true");
      }

      //Password Field Autocomplete
      if (property == "glide.login.autocomplete") {
        gs.setProperty("glide.login.autocomplete", "false");
      }

      //Session Window Timeout
      if (property == "glide.ui.user_cookie.life_span_in_days") {
        gs.setProperty(
          "glide.ui.user_cookie.life_span_in_days",
          sec_configs[property]
        );
      }

      //Disable Password-Less Authentication
      if (property == "glide.login.no_blank_password") {
        gs.setProperty("glide.login.no_blank_password", "true");
      }

      //Rotate HTTP Session Identifiers
      if (property == "glide.ui.rotate_sessions") {
        gs.setProperty("glide.ui.rotate_sessions", "true");
      }

      //Cookies HTTP Only
      if (property == "glide.cookies.http_only") {
        gs.setProperty("glide.cookies.http_only", "true");
      }

      //Absolute Session Timeout
      if (property == "glide.ui.user_cookie.max_life_span_in_days") {
        gs.setProperty(
          "glide.ui.user_cookie.max_life_span_in_days",
          configs[property]
        );
      }

      //Secure Session Cookies
      if (property == "glide.ui.secure_cookies") {
        gs.setProperty("glide.ui.secure_cookies", "true");
      }

      //Anti-CSRF Token
      if (property == "glide.security.use_csrf_token") {
        gs.setProperty("glide.security.use_csrf_token", "true");
      }

      //Remove Credentials From Welcome Page
      if (property == "System UI > Welcome Page") {
        var wl = new GlideRecordSecure("sys_home");
        wl.addQuery("short_description", "How To Login");
        wl.addQuery("active", true);
        wl.query();
        while (wl.next()) {
          wl.setValue("active", false);
          wl.update();
        }
      }
    }
  },

  //function to enable attachments properties
  enableAttachments: function (configs) {
    for (var property in configs) {
      //Upload MIME Type Restriction
      if (property == "glide.security.file.mime_type.validation") {
        gs.setProperty("glide.security.file.mime_type.validation", "true");
      }

      //Downloadable File Types
      if (property == "glide.ui.strict_customer_uploaded_content_types") {
        gs.setProperty(
          "glide.ui.strict_customer_uploaded_content_types",
          configs[property]
        );
      }

      //Restrict File Extensions
      if (property == "glide.attachment.extensions") {
        gs.setProperty("glide.attachment.extensions", configs[property]);
      }

      //glide.ui.attachment.download_mime_types
      if (property == "glide.ui.attachment.download_mime_types") {
        var force_download = gs.getProperty(
          "glide.ui.attachment.force_download_all_mime_types"
        );
        if (force_download != "true") {
          gs.setProperty(
            "glide.ui.attachment.force_download_all_mime_types",
            "true"
          );
        }
        gs.setProperty(
          "glide.ui.attachment.download_mime_types",
          configs[property]
        );
      }

      //glide.http.cache_control
      if (property == "glide.http.cache_control") {
        gs.setProperty("glide.http.cache_control", configs[property]);
      }

      //Specify Blacklisted File Types
      if (property == "glide.attachment.blacklisted.types") {
        this.enableBlacklist();
        var gr_types = new GlideRecord("sys_properties");
        if (!gr_types.get("name", "glide.attachment.blacklisted.types")) {
          gr_types.initialize();
          gr_types.name = "glide.attachment.blacklisted.types";
          gr_types.type = "string";
          gr_types.value = configs[property];
          gr_types.insertWithReferences();
        } else {
          gs.setProperty(
            "glide.attachment.blacklisted.types",
            configs[property]
          );
        }
      }

      //Restrict Unauthenticated Access to Attachments
      if (property == "glide.image_provider.security_enabled") {
        gs.setProperty("glide.image_provider.security_enabled", "true");
      }

      //Enable Blacklist for Attachments
      if (property == "glide.security.attachment_type.use_blacklist") {
        this.enableBlacklist();
      }

      //Specify Blacklisted Extensions
      if (property == "glide.attachment.blacklisted.extensions") {
        this.enableBlacklist();
        var gr_ext = new GlideRecord("sys_properties");
        if (!gr_ext.get("name", "glide.attachment.blacklisted.extensions")) {
          gr_ext.initialize();
          gr_ext.name = "glide.attachment.blacklisted.extensions";
          gr_ext.type = "string";
          gr_ext.value = configs[property];
          gr_ext.insertWithReferences();
        } else {
          gs.setProperty(
            "glide.attachment.blacklisted.extensions",
            configs[property]
          );
        }
      }

      //glide.security.strict.user_image_upload
      if (property == "glide.security.strict.user_image_upload") {
        var gr_image = new GlideRecord("sys_properties");
        if (!gr_image.get("name", "glide.security.strict.user_image_upload")) {
          gr_image.initialize();
          gr_image.name = "glide.security.strict.user_image_upload";
          gr_image.type = "boolean";
          gr_image.value = "true";
          gr_image.insertWithReferences();
        } else {
          gs.setProperty("glide.security.strict.user_image_upload", "true");
        }
      }
    }
  },

  //function to enable email security properties
  enableEmailSecurity: function (configs) {
    for (var property in configs) {
      //Convert Inbound Email HTML
      if (
        property ==
        "glide.email.inbound.convert_html_inline_attachment_references"
      ) {
        gs.setProperty("glide.email.read.active", "true");
        var gr_html = new GlideRecord("sys_properties");
        if (
          !gr_html.get(
            "name",
            "glide.email.inbound.convert_html_inline_attachment_references"
          )
        ) {
          gr_html.initialize();
          gr_html.name =
            "glide.email.inbound.convert_html_inline_attachment_references";
          gr_html.type = "boolean";
          gr_html.value = "false";
          gr_html.insertWithReferences();
        } else {
          gs.setProperty(
            "glide.email.inbound.convert_html_inline_attachment_references",
            "false"
          );
        }
      }

      //Restrict Emails by Domain
      if (property == "glide.user.trusted_domain") {
        gs.setProperty("glide.email.read.active", "true");
        gs.setProperty("glide.pop3readerjob.create_caller", "true");
        gs.setProperty("glide.user.trusted_domain", configs[property]);
      }

      //Set Complex "Default" Password
      if (property == "glide.user.default_password") {
        gs.setProperty("glide.email.read.active", "true");
        gs.setProperty("glide.pop3readerjob.create_caller", "true");
        gs.setProperty("glide.user.default_password", configs[property]);
      }

      //Restrict Access to Emails with Empty Target Table
      if (property == "glide.email.email_with_no_target_visible_to_all") {
        gs.setProperty(
          "glide.email.email_with_no_target_visible_to_all",
          "false"
        );
      }
    }
  },

  //function to enable security whitelisting properties
  enableSecurityWhitelisting: function (configs) {
    for (var property in configs) {
      //Allow Entity Validation with Whitelisting - 10.4.2.2
      if (property == "glide.stax.whitelist_enabled") {
        var prereq = gs.getProperty("glide.xml.entity.whitelist");
        if (!gs.nil(prereq)) {
          gs.setProperty("glide.xml.entity.whitelist.enabled", "true");
          var gr_xml = new GlideRecord("sys_properties");
          if (!gr_xml.get("name", "glide.stax.whitelist_enabled")) {
            gr_xml.initialize();
            gr_xml.name = "glide.stax.whitelist_enabled";
            gr_xml.type = "boolean";
            gr_xml.value = "true";
            gr_xml.insertWithReferences();
          } else {
            gs.setProperty("glide.stax.whitelist_enabled", "true");
          }
        }
      }

      //Disable Entity Expansion - 10.4.2.1
      if (property == "glide.stax.allow_entity_resolution") {
        var prereq_disable = gs.getProperty("glide.xml.entity.whitelist");
        if (!gs.nil(prereq_disable)) {
          gs.setProperty("glide.xml.entity.whitelist.enabled", "true");
          gs.setProperty("glide.stax.whitelist_enabled", "true");
          var gr_entity = new GlideRecord("sys_properties");
          if (!gr_entity.get("name", "glide.stax.allow_entity_resolution")) {
            gr_entity.initialize();
            gr_entity.name = "glide.stax.allow_entity_resolution";
            gr_entity.type = "boolean";
            gr_entity.value = "false";
            gr_entity.insertWithReferences();
          } else {
            gs.setProperty("glide.stax.allow_entity_resolution", "false");
          }
        }
      }

      //Allow Entity Validation with Whitelisting (10.4.1.1)
      if (property == "glide.xml.entity.whitelist.enabled") {
        var prereq_allow = gs.getProperty("glide.xml.entity.whitelist");
        if (!gs.nil(prereq_allow)) {
          var gr_validate = new GlideRecord("sys_properties");
          if (!gr_validate.get("name", "glide.xml.entity.whitelist.enabled")) {
            gr_validate.initialize();
            gr_validate.name = "glide.xml.entity.whitelist.enabled";
            gr_validate.type = "boolean";
            gr_validate.value = "true";
            gr_validate.insertWithReferences();
          } else {
            gs.setProperty("glide.xml.entity.whitelist.enabled", "true");
          }
        }
      }

      //Enable URL Whitelist for Cross-Origin iframe Communication
      if (property == "glide.ui.concourse.onmessage_enforce_same_origin") {
        gs.setProperty(
          "glide.ui.concourse.onmessage_enforce_same_origin",
          "true"
        );
      }

      //Setting Entity Expansion Threshold
      if (property == "glide.xmlutil.max_entity_expansion") {
        var gr_exp = new GlideRecord("sys_properties");
        if (!gr_exp.get("name", "glide.xmlutil.max_entity_expansion")) {
          gr_exp.initialize();
          gr_exp.name = "glide.xmlutil.max_entity_expansion";
          gr_exp.type = "integer";
          gr_exp.value = configs[property];
          gr_exp.insertWithReferences();
        } else {
          gs.setProperty(
            "glide.xmlutil.max_entity_expansion",
            configs[property]
          );
        }
      }

      //URL Whitelist For Logout Redirects
      if (property == "glide.security.url.whitelist") {
        var gr_url = new GlideRecord("sys_properties");
        if (!gr_url.get("name", "glide.security.url.whitelist")) {
          gr_url.initialize();
          gr_url.name = "glide.security.url.whitelist";
          gr_url.type = "string";
          gr_url.value = configs[property];
          gr_url.insertWithReferences();
        } else {
          gs.setProperty("glide.security.url.whitelist", configs[property]);
        }
      }

      //X-Frame-Options: SAMEORIGIN
      if (property == "glide.set_x_frame_options") {
        gs.setProperty("glide.set_x_frame_options", "true");
      }

      //XML External Entity Processing - Whitelist
      if (property == "glide.xml.entity.whitelist") {
        gs.setProperty("glide.xml.entity.whitelist", configs[property]);
      }

      //Enforce Relative Links
      if (property == "glide.cms.catalog_uri_relative") {
        gs.setProperty("glide.cms.catalog_uri_relative", "true");
      }
    }
  },

  //function to enable secure communications properties
  enableSecureCommunications: function (configs) {
    for (var property in configs) {
      //Certificate Trust
      if (property == "com.glide.communications.trustmanager_trust_all") {
        gs.setProperty(
          "com.glide.communications.trustmanager_trust_all",
          "false"
        );
      }

      //Disabling SSLv2/SSLv3
      if (property == "glide.outbound.sslv3.disabled") {
        gs.setProperty("glide.outbound.sslv3.disabled", "true");
      }
    }
  },

  //function to enable security best practices properties
  enableSecurityBestPractices: function (configs) {
    for (var property in configs) {
      //Disabling SQL error messages
      if (property == "glide.db.loguser") {
        var gr_loguser = new GlideRecord("sys_properties");
        if (!gr_loguser.get("name", "glide.db.loguser")) {
          gr_loguser.initialize();
          gr_loguser.name = "glide.db.loguser";
          gr_loguser.type = "boolean";
          gr_loguser.value = "false";
          gr_loguser.insertWithReferences();
        } else {
          gs.setProperty("glide.db.loguser", "false");
        }
      }

      //Mobile UI Obfuscation
      if (property == "glide.ui.m.blur_ui_when_backgrounded") {
        gs.setProperty("glide.ui.m.blur_ui_when_backgrounded", "true");
      }
    }
  },

  //function to enable input validation properties
  enableInputValidation: function (configs) {
    for (var property in configs) {
      //Escape Excel Formula
      if (property == "glide.export.escape_formulas") {
        gs.setProperty("glide.export.escape_formulas", "true");
      }

      //Escape XML
      if (property == "glide.ui.escape_text") {
        gs.setProperty("glide.ui.escape_text", "true");
      }

      //Escape HTML
      if (property == "glide.ui.escape_html_list_field") {
        gs.setProperty("glide.ui.escape_html_list_field", "true");
      }

      //Allow Javascript tags in Embedded HTML
      if (property == "glide.ui.security.codetag.allow_script") {
        gs.setProperty("glide.ui.security.codetag.allow_script", "false");
      }

      //SOAP Request Strict Security
      if (property == "glide.soap.strict_security") {
        gs.setProperty("glide.soap.strict_security", "true");
      }

      //Escape JavaScript
      if (property == "glide.html.escape_script") {
        gs.setProperty("glide.html.escape_script", "true");
      }

      //Enable AJAXEvaluate
      if (property == "glide.script.allow.ajaxevaluate") {
        gs.setProperty("glide.script.allow.ajaxevaluate", "false");
      }

      //Client Generated Scripts Sandbox
      if (property == "glide.script.use.sandbox") {
        gs.setProperty("glide.script.use.sandbox", "true");
      }

      //HTML Sanitizer
      if (property == "glide.html.sanitize_all_fields") {
        gs.setProperty("glide.html.sanitize_all_fields", "true");
      }

      //Jelly/JS Interpolation
      if (property == "glide.ui.jelly.js_interpolation.protect") {
        gs.setProperty("glide.ui.jelly.js_interpolation.protect", "true");
      }

      //Escape Jelly
      if (property == "glide.ui.escape_all_script") {
        gs.setProperty("glide.ui.escape_all_script", "true");
      }

      //Allow Embedded HTML Code
      if (property == "glide.ui.security.allow_codetag") {
        gs.setProperty("glide.ui.security.allow_codetag", "false");
      }
    }
  },

  //run daily data management job
  runJob: function () {
    // get PA job and execute it.
    var appsec_job = new GlideRecord("sysauto_script");
    appsec_job.get("name", "[AppSec] Daily Data Management");
    if (typeof SncTriggerSynchronizer != "undefined") {
      SncTriggerSynchronizer.executeNow(appsec_job);
    } else {
      Packages.com.snc.automation.TriggerSynchronizer.executeNow(appsec_job);
    }
  },

  //function to set security configurations for Hardening widget
  activate_security_configurations: function (sec_configs) {
    if (sec_configs["category"] == "Access Control") {
      this.enableAccessControl(sec_configs);
    }

    if (sec_configs["category"] == "Attachments") {
      this.enableAttachments(sec_configs);
    }

    if (sec_configs["category"] == "Session Management") {
      this.enableSessionManagement(sec_configs);
    }

    if (sec_configs["category"] == "Email Security") {
      this.enableEmailSecurity(sec_configs);
    }

    if (sec_configs["category"] == "Security Whitelisting") {
      this.enableSecurityWhitelisting(sec_configs);
    }

    if (sec_configs["category"] == "Secure Communications") {
      this.enableSecureCommunications(sec_configs);
    }

    if (sec_configs["category"] == "Security Best Practices") {
      this.enableSecurityBestPractices(sec_configs);
    }

    if (sec_configs["category"] == "Input Validation") {
      this.enableInputValidation(sec_configs);
    }

    this.runJob();

    return "Success";
  },

  type: "HardeningUtil",
};

```