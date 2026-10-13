# EdgeOne 云端存储

项目 `fitlog`（`pages-dgnpf9fpprkr`）通过 GitHub 仓库 `yepYoung/fitlog` 的 `main` 分支自动部署。前端使用 Vite，服务端接口位于 `cloud-functions/api/[[path]].js`；记录、照片和设置保存在当前项目的 EdgeOne Blob 命名空间 `fitlog-private` 中。

项目控制台：https://console.cloud.tencent.com/edgeone/makers/project/pages-dgnpf9fpprkr/index

2026-10-13 检查时，项目未绑定自定义域名；控制台“预览”生成的链接有效期为 3 小时。长期跨设备访问应绑定一个固定域名，之后都使用该网址。旧浏览器记录仍须在原网址、原设备迁入。

## 配置与部署

在 EdgeOne 项目设置中新增服务端环境变量 `FITLOG_ACCESS_KEY`，口令至少 6 个字符，建议使用密码管理器生成较长的随机口令，选择生产环境。不要加 `VITE_` 前缀，也不要把实际口令提交到 Git。

保留当前构建设置：根目录 `./`、安装命令 `npm install`、编译命令 `npm run build`、输出目录 `dist`。推送 `main` 后等待构建成功。环境变量变更需要重新部署才能生效。

在各台设备上打开同一项目，输入同一个访问口令。会话保存在 HttpOnly、SameSite=Strict Cookie 中，HTTPS 下启用 Secure，有效期 30 天。修改访问口令并重新部署后，旧会话失效。

## 数据行为

- 保存、修改和删除等待服务端确认；请求失败时保留当前内容并显示错误。
- 每条记录独立写入，设备间新增不同记录不会覆盖。不同设备同时修改同一记录时，以最后完成的保存为准。
- 页面重新获得焦点时读取最新记录；页面保持可见时每分钟刷新，也可在设置中手动同步。读取使用 Blob 强一致模式。
- 旧浏览器数据不会自动覆盖云端。在原设备、原网址打开设置，选择“迁入本机旧记录”，迁入记录及照片。本机 `fitlog_data` 和 IndexedDB 原数据保留。
- 迁入的记录与后续编辑分开存储，云端编辑优先；独立删除标记阻止其他旧设备重新导入已删除记录。
- “导出数据（含照片）”生成 JSON，包含记录、设置和照片数据。请妥善保存。
- “清除云端所有数据”影响全部设备，删除记录内容、照片及设置，保留用于阻止旧数据复活的记录 ID 标记。
- 未提交的运动草稿、主题偏好仍保存在本机。记录提交及云端读取需要联网。替换照片后旧图片保留在私有存储中，清除全部云端数据时一并清除。

## 本地开发与验证

复制 `.env.example` 为 `.env.local`，填写仅供本地使用的口令，执行 `npm install` 和 `npm run dev`。开发接口使用 `.local-data/` 下的本地文件，不连接生产存储。该目录与环境变量文件均被 Git 忽略。

`npm test` 运行前端及服务端测试，`npm run typecheck` 检查 TypeScript，`npm run build` 生成前端产物。生产环境需再验证：未登录读取数据返回 401；输入口令后可保存；另一设备可读取记录和照片。

腾讯官方参考：[Blob 存储](https://cloud.tencent.com/document/product/1552/131425)、[Node Functions](https://pages.edgeone.ai/document/node-functions)。
