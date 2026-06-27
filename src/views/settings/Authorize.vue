<template>
  <a-layout-content class="knife4j-body-content">
    <div class="authorize">
      <a-row>
        <a-button type="primary" @click="resetAuth">{{ $t('auth.cancel') }}</a-button>
      </a-row>
      <a-table
        v-if="securityKeyFlag"
        style="margin-top:15px;"
        size="small"
        :columns="columns"
        :dataSource="securityArr"
        rowKey="id"
        :pagination="pagination"
        bordered>
          <template #bodyCell="{ column, record }">
            <template v-if="column.dataIndex === 'key'">
              {{ record.key }}({{ record.type }})
            </template>
            <template v-else-if="column.dataIndex === 'value'">
              <a-input
                :value="record.value"
                :data-id="record.id"
                :placeholder="valuePlaceholder(record)"
                @change="authParamChange"
                allowClear />
            </template>
          </template>
      </a-table>
      <a-row v-if="oauthFlag" style="margin-top:15px;">
        <a-card title="OAuth2">
          <a-row>
            <a-col :span="4">Flow</a-col>
            <a-col :span="18">
              <a-input id="grant" readonly :defaultValue="oauth.grantType" />
            </a-col>
          </a-row>
          <a-row v-if="oauth.grantType == 'accessCode' || oauth.grantType == 'implicit'" style="margin-top:15px;">
            <a-col :span="4">Authorization URL</a-col>
            <a-col :span="18">
              <a-input id="authorizeUrl" readonly :defaultValue="oauth.authorizeUrl" />
            </a-col>
          </a-row>
          <a-row
            v-if="oauth.grantType == 'password' || oauth.grantType == 'application' || oauth.grantType == 'client_credentials'"
            style="margin-top:15px;">
            <a-col :span="4">Token URL</a-col>
            <a-col :span="18">
              <a-input id="tokenUrl" readonly :defaultValue="oauth.tokenUrl" />
            </a-col>
          </a-row>
          <a-row v-if="oauth.grantType == 'password'" style="margin-top:15px;">
            <a-col :span="4">username</a-col>
            <a-col :span="18">
              <a-input id="username" :value="oauth.username" @change="userChange" />
            </a-col>
          </a-row>
          <a-row v-if="oauth.grantType == 'password'" style="margin-top:15px;">
            <a-col :span="4">password</a-col>
            <a-col :span="18">
              <a-input id="password" type="password" :value="oauth.password" @change="pwdChange" />
            </a-col>
          </a-row>
          <a-row style="margin-top:15px;">
            <a-col :span="4">clientId</a-col>
            <a-col :span="18">
              <a-input :value="oauth.clientId" @change="clientChage" />
            </a-col>
          </a-row>
          <a-row
            v-if="oauth.grantType == 'accessCode' || oauth.grantType == 'password' || oauth.grantType == 'application' || oauth.grantType == 'client_credentials'"
            style="margin-top:15px;">
            <a-col :span="4">clientSecret</a-col>
            <a-col :span="18">
              <a-input :value="oauth.clientSecret" @change="clientSecretChage" />
            </a-col>
          </a-row>
          <a-row style="margin-top:15px;">
            <a-col :span="4"></a-col>
            <a-col :span="18">
              <a-button type="primary" @click="auth">Authorize</a-button>
            </a-col>
          </a-row>
        </a-card>
      </a-row>
    </div>
  </a-layout-content>
</template>
<script>
// Ported from knife4j-vue (Vue2) Authorize.vue to Vue3 + ant-design-vue 3.x.
// Differences from upstream:
//   - table value cell uses the Vue3 #bodyCell slot (upstream used slot/slot-scope);
//   - this.$localStore -> localStore, this.$message -> message (imported);
//   - the antd-vue1 form (this.$form.createForm) is dropped — the OAuth2 card
//     binds inputs directly and never used the form object.
import constant from "@/store/constants";
import KUtils from "@/core/utils";
import localStore from '@/store/local.js'
import { message } from 'ant-design-vue'
import DebugAxios from "axios";
import qs from 'qs'

export default {
  props: {
    data: {
      type: Object
    }
  },
  data() {
    return {
      pagination: false,
      securityKeyFlag: false,
      oauthFlag: false,
      oauth: null,
      columns: [
        { title: '参数key', dataIndex: 'key', width: 200 },
        { title: '参数名称', dataIndex: 'name', width: 160 },
        { title: 'in', dataIndex: 'in', width: 80 },
        // 参数值列不设 width，自动撑满表格剩余宽度（最宽）
        { title: '参数值', dataIndex: 'value' }
      ],
      // 全局的
      globalSecuritys: [],
      globalSecurityObject: {},
      // 请求头Authorize参数
      securityArr: []
    };
  },
  methods: {
    valuePlaceholder(record) {
      // http bearer schemes get a "Bearer " prefix auto-added by Debug.vue
      // (KUtils.getOAuth2BearerValue); everything else (apiKey etc.) is sent
      // verbatim, so the user must include any "Bearer " prefix themselves.
      if (record.schema === "bearer") {
        return "输入 JWT，无需 Bearer 前缀（调试时自动添加）";
      }
      if (record.in === "header") {
        return "输入 " + record.name + " 的值（如需 Bearer 认证请包含 Bearer 前缀）";
      }
      return "输入 " + record.name + " 的值";
    },
    userChange(e) {
      this.oauth.username = e.target.value;
    },
    pwdChange(e) {
      this.oauth.password = e.target.value;
    },
    clientChage(e) {
      this.oauth.clientId = e.target.value;
    },
    clientSecretChage(e) {
      this.oauth.clientSecret = e.target.value;
    },
    auth() {
      if (this.oauth.grantType == "password") {
        if (KUtils.strBlank(this.oauth.username)) {
          message.info("username can't empty!!!");
          return false;
        }
        if (KUtils.strBlank(this.oauth.password)) {
          message.info("password can't empty!!!");
          return false;
        }
      }
      if (KUtils.strBlank(this.oauth.clientId)) {
        message.info("clientId can't empty!!!");
        return false;
      }
      if (this.oauth.grantType == "accessCode" || this.oauth.grantType == "password" || this.oauth.grantType == "application" || this.oauth.grantType == "client_credentials") {
        if (KUtils.strBlank(this.oauth.clientSecret)) {
          message.info("clientSecret can't empty!!!");
          return false;
        }
      }
      if (this.oauth.grantType == "implicit" || this.oauth.grantType == "accessCode") {
        // 判断类型
        var openUrl = this.oauth.authorizeUrl;
        var params = new Array();
        var location = window.location;
        var orig = location.origin + location.pathname;
        // 替换掉doc.html
        orig = orig.replace("/doc.html", "");
        if (orig.endsWith("/")) {
          orig = orig + KUtils.getOAuth2Html(true);
        } else {
          orig = orig + "/" + KUtils.getOAuth2Html(true);
        }
        var redirectUri = encodeURIComponent(orig);
        this.oauth.redirectUri = redirectUri;
        if (this.oauth.grantType == "implicit") {
          // 简化模式,拼装参数
          params.push("response_type=token");
          params.push("client_id=" + this.oauth.clientId);
          params.push("redirect_uri=" + redirectUri);
          params.push("state=SELF" + this.oauth.state);
          var paramUrl = params.join("&");
          if (openUrl.indexOf("?") >= 0) {
            openUrl = openUrl + "&" + paramUrl;
          } else {
            openUrl = openUrl + "?" + paramUrl;
          }
        } else if (this.oauth.grantType == "accessCode") {
          // 授权码模式
          params.push("response_type=code");
          params.push("client_id=" + this.oauth.clientId);
          params.push("redirect_uri=" + redirectUri);
          params.push("state=SELF" + this.oauth.state);
          var paramUrl = params.join("&");
          if (openUrl.indexOf("?") >= 0) {
            openUrl = openUrl + "&" + paramUrl;
          } else {
            openUrl = openUrl + "?" + paramUrl;
          }
        }
        this.oauth.sync();
        window.open(openUrl);
      } else if (this.oauth.grantType == "password") {
        // 密码模式
        const debugInstance = DebugAxios.create();
        var formData = {
          grant_type: "password",
          username: this.oauth.username,
          password: this.oauth.password
        };
        var requestConfig = {
          url: this.oauth.tokenUrl,
          method: "post",
          auth: {
            username: this.oauth.clientId,
            password: this.oauth.clientSecret
          },
          params: null,
          timeout: 0,
          data: qs.stringify(formData)
        };
        debugInstance
          .request(requestConfig)
          .then((res) => {
            var data = res.data;
            this.applyHignSecurityVersion(data);
            this.oauth.granted = true;
            this.oauth.sync();
            message.info("SUCCESS");
          })
          .catch((err) => {
            if (err.response) {
              console.log(err);
            } else {
              message.error(err.message);
            }
          });
      } else if (this.oauth.grantType == "application" || this.oauth.grantType == "client_credentials") {
        // 客户端模式
        const debugInstance = DebugAxios.create();
        var formData = {
          grant_type: "client_credentials"
        };
        var requestConfig = {
          url: this.oauth.tokenUrl,
          method: "post",
          auth: {
            username: this.oauth.clientId,
            password: this.oauth.clientSecret
          },
          params: null,
          timeout: 0,
          data: qs.stringify(formData)
        };
        debugInstance
          .request(requestConfig)
          .then((res) => {
            var data = res.data;
            this.applyHignSecurityVersion(data);
            this.oauth.granted = true;
            this.oauth.sync();
            message.info("SUCCESS");
          })
          .catch((err) => {
            if (err.response) {
              console.log(err);
            } else {
              message.error(err.message);
            }
          });
      }
    },
    applyHignSecurityVersion(data) {
      //兼容高版本security针对oauth授权后字段变更
      if (KUtils.checkUndefined(data)) {
        if (KUtils.checkUndefined(data.token_type)) {
          this.oauth.accessToken = data.token_type + " " + data.access_token;
          this.oauth.tokenType = data.token_type;
        } else if (KUtils.checkUndefined(data.tokenType)) {
          this.oauth.accessToken = data.tokenType + " " + data.value;
          this.oauth.tokenType = data.tokenType;
        }
      }
    },
    initLocalOAuth() {
      var oauths = this.data.instance.oauths;
      if (KUtils.checkUndefined(oauths)) {
        this.oauthFlag = true;
        this.oauth = oauths;
      }
    },
    initLocalSecuritys() {
      // 初始化从本地读取
      var that = this;
      that.initLocalOAuth();
      var backArr = that.data.instance.securityArrs;
      if (KUtils.arrNotEmpty(backArr)) {
        this.securityKeyFlag = true;
      }

      // 前缀+实例id
      var key = constant.globalSecurityParamPrefix + this.data.instance.id;
      var tmpGlobalSecuritys = [];
      localStore.getItem(constant.globalSecurityParameterObject).then((gbp) => {
        // 判断当前分组下的security是否为空
        if (KUtils.arrNotEmpty(backArr)) {
          // 读取本分组下的security
          localStore.getItem(key).then((currentSecurity) => {
            if (KUtils.checkUndefined(currentSecurity)) {
              // 当前分组不为空
              // 需要对比后端最新的参数情况,后端有可能已经删除参数
              var tmpSecuritys = [];
              backArr.forEach((security) => {
                // 判断当前的key在缓存中是否存在
                var caches = currentSecurity.filter((se) => se.id == security.id);
                if (caches.length > 0) {
                  // 存在
                  if (KUtils.strNotBlank(security.value)) {
                    tmpSecuritys.push(security);
                  } else {
                    tmpSecuritys.push(caches[0]);
                  }
                } else {
                  tmpSecuritys.push(security);
                }
              });
              that.securityArr = tmpSecuritys;
            } else {
              that.securityArr = backArr;
            }
            // 当前分组下的security不为空，判断全局分组，兼容升级的情况下,gbp可能会存在为空的情况
            if (KUtils.checkUndefined(gbp)) {
              that.globalSecurityObject = gbp;
              tmpGlobalSecuritys = tmpGlobalSecuritys.concat(gbp);
              // 从全局参数中更新当前分组下的参数
              that.securityArr.forEach((selfSecurity) => {
                var globalValueTmp = gbp[selfSecurity.id];
                if (KUtils.checkUndefined(globalValueTmp)) {
                  // id相等，更新value值
                  selfSecurity.value = globalValueTmp;
                } else {
                  that.globalSecurityObject[selfSecurity.id] = selfSecurity.value;
                }
              });
            } else {
              // 为空的情况下,则默认直接新增当前分组下的security
              that.securityArr.forEach((sa) => {
                that.globalSecurityObject[sa.id] = sa.value;
              });
            }
            that.storeToLocalIndexDB();
          });
        }
      });
    },
    storeToLocalIndexDB() {
      // 前缀+实例id
      var key = constant.globalSecurityParamPrefix + this.data.instance.id;
      // 更新当前实例下的securitys
      localStore.setItem(key, this.securityArr);
      // 更新全局的securitys
      localStore.setItem(constant.globalSecurityParameterObject, this.globalSecurityObject);
    },
    resetAuth() {
      if (this.oauthFlag) {
        this.resetOAuth2();
      }
      if (this.securityKeyFlag) {
        this.resetCommonSecurtyAuth();
      }
      message.info("SUCCESS");
    },
    resetOAuth2() {
      this.oauth.clear();
    },
    resetCommonSecurtyAuth() {
      const tmpArr = this.securityArr;
      if (KUtils.arrNotEmpty(tmpArr)) {
        tmpArr.forEach((security) => {
          security.value = "";
          this.globalSecurityObject[security.id] = "";
        });
        this.securityArr = tmpArr;
        this.storeToLocalIndexDB();
      }
    },
    authParamChange(e) {
      var target = e.target;
      var pkId = target.getAttribute("data-id");
      var value = target.value;
      this.securityArr.forEach((security) => {
        if (security.id == pkId) {
          security.value = value;
          this.globalSecurityObject[security.id] = value;
        }
      });
      // 更新全局参数
      this.storeToLocalIndexDB();
    }
  },
  created() {
    this.initLocalSecuritys();
  }
};
</script>

<style scoped>
.authorize {
  margin: 12px 0;
  width: 100%;
  box-sizing: border-box;
  padding: 0 8px;
}
</style>
