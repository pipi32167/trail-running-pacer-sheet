/* Shared copy for the page, the exported SVG and the wallpaper.
   Keys are flat. zh is the source; en must keep the same key set. */
'use strict';
(function (root) {
  const zh = {
    'page.title': '山野有数 · 体感一致配速表',
    'page.description': '上传 GPX，输入完赛时间与发枪时间，生成体感一致的越野配速表。',

    'brand.name': '山野有数',
    'brand.tag': 'TRAIL NOTES',
    'brand.home': '山野有数 首页',
    'header.note': '一条路线，一份山野计划。',
    'lang.group': '语言',
    'lang.zh': '中文',
    'lang.en': 'EN',

    'hero.eyebrow': '给下一次出发，画个计划',
    'hero.title1': '山路有起伏，',
    'hero.title2': '奔跑有节奏。',
    'hero.desc1': '一份体感一致的越野配速表。',
    'hero.desc2': '带上你的路线，剩下的交给计算。',
    'hero.labelSummit': '慢慢来，也会到。',
    'hero.labelRoute': 'your trail, your rhythm',
    'hero.stamp': '去山里<br>找节奏',

    'planner.title': '把路线放在这里',
    'planner.pencil': '路线、用时、发枪时间 ↘',
    'form.step1': '你的路线',
    'form.dropTitle': '拖入 GPX 路线文件',
    'form.dropHint': '或点击选择 · GPX 格式，最大 12 MB',
    'form.dropAria': '选择或拖入 GPX 路线文件',
    'form.privacy': 'GPX 仅在浏览器内处理，不上传到服务器。',
    'form.privacyCached': 'GPX 仅在浏览器内处理。页面已缓存，断网也能计算。',
    'form.step2': '目标完赛时间',
    'form.durationUnit': '小时 : 分钟',
    'form.timeHint': '按自己的节奏，给终点一个时间。',
    'form.targetNote': '五档参考方案 · 相邻间隔 30 分钟',
    'form.targetNoteStep': '五档参考方案 · 相邻间隔 {minutes} 分钟',
    'form.targetNoteOne': '仅生成目标方案',
    'form.step3': '发枪时间',
    'form.required': '必填',
    'form.startHint': '填写比赛当地时间，用于计算到站钟点与跨日。',
    'form.footer1': '把力气留给山野，',
    'form.footer2': '把计算交给这里。',
    'form.generate': '生成配速表',
    'form.generating': '正在计算山路节奏…',
    'form.inspecting': '正在读取路线…',

    'advanced.title': '高级选项',
    'advanced.titleAlt': 'Advanced options',
    'advanced.defaults': '已为你选好默认值',
    'advanced.intro': '保留默认值即可生成。修改参数后，点击“生成配速表”更新结果。',
    'advanced.track': '选择路线',
    'advanced.smooth': '高程平滑窗口',
    'advanced.threshold': '峰谷反转阈值',
    'advanced.ascentFactor': '爬升等效距离',
    'advanced.fatigue': '距离翻倍配速增幅',
    'advanced.step': '相邻方案间隔',
    'advanced.minutes': '分钟',
    'advanced.bracket': '表格括号内容',
    'advanced.options': '目标方案',
    'option.arrival': '到站钟点（当地时间）',
    'option.pace': '区间配速（分:秒/km）',
    'option.eqPace': '区间等效配速（分:秒/km）',
    'option.five': '五档方案',
    'option.one': '仅目标方案',
    'advanced.repairTitle': '缺失高程自动补齐',
    'advanced.repairBody': '中间缺口按距离插值，首尾使用最近有效高程。生成结果会标注修复数量；全部高程缺失时停止计算。',
    'advanced.cpTitle': '站点与停留',
    'advanced.cpSub': '关门时间填写发枪后的累计用时',
    'advanced.manualTitle': '手动站点（可选）',
    'advanced.manualBody': '未识别到站点时默认只列起终点。每行填写：名称,累计公里,停留分钟,关门用时。终点会自动加入。',
    'advanced.manualAria': '手动站点',
    'advanced.manualPlaceholder': '山脚补给站,10.5,5,03:00',

    'underForm.left': '体感一致 · 随地形调整配速',
    'underForm.right': '每一段山路，都值得好好计划。',

    'results.eyebrow': 'YOUR TRAIL PLAN / 配速计划',
    'results.title': '你的山野节奏',
    'results.exportsAria': '下载配速表',
    'results.wallpaper': '壁纸',
    'results.print': '打印',
    'results.colorLabel': '图颜色',
    'results.profileTitle': '沿途的起伏',
    'results.profileSub': '高程轮廓 · 100 m 平滑，仅作路线示意',
    'results.chartAria': '路线高程曲线',
    'results.tableAria': '配速表，可横向滚动',
    'results.mobileHint': '左右滑动查看全部方案 →',
    'results.notesTitle': '计算说明与路线提示',

    'wall.eyebrow': 'HOME SCREEN / 手机壁纸',
    'wall.title': '把配速表放进手机',
    'wall.desc': '按原版表格等比缩小，上下补留白，保留全部站点与方案。',
    'wall.device': '机型',
    'wall.layout': '版式',
    'wall.landscape': '横版 · 表格旋转 90°，占满屏宽',
    'wall.portrait': '竖版 · 表格保持正向',
    'wall.top': '顶部留白 %',
    'wall.bottom': '底部留白 %',
    'wall.theme': '底色',
    'wall.dark': '深色',
    'wall.light': '浅色',
    'wall.width': '宽度 px',
    'wall.height': '高度 px',
    'wall.overlay': '叠加锁屏遮挡预览',
    'wall.download': '下载壁纸 PNG',
    'wall.boardLandscape': '横版',
    'wall.boardPortrait': '竖版',
    'wall.note': '{board} · {width} × {height} px。{tip}保留原表全部内容，预览叠层不会导出。展开的通知仍可能遮挡表格；可收起通知或增加底部留白。',
    'wall.tipShare': '表格占屏高 {share}%。',
    'wall.tipRotate': '竖版受屏宽限制，表格只占屏高 {share}%；切横版可占 {other}%。',
    'wall.exporting': '导出中…',
    'wall.maskDate': '11月13日 星期五',
    'wall.device.iphone-61': 'iPhone 15 / 15 Pro（6.1 英寸）',
    'wall.device.iphone-67': 'iPhone 15 Plus / Pro Max（6.7 英寸）',
    'wall.device.iphone-69': 'iPhone 16 Pro Max（6.9 英寸）',
    'wall.device.iphone-16pro': 'iPhone 16 Pro（6.3 英寸）',
    'wall.device.android-1080': 'Android',
    'wall.device.custom': '自定义尺寸',
    'wall.fileSuffix': '{name}-壁纸-{device}-{board}',

    'footer.left': '山野有数 × 每一步，都算数。',
    'footer.right': '基于体感一致思路的独立实现',

    'time.nextDay': '次日',
    'time.daysLater': '+{days}天',
    'time.start': '发枪',
    'time.arrival': '到站',
    'time.finish': '完赛',
    'time.pace': '配速',
    'time.eqPace': '等效配速',
    'time.elapsed': '累计耗时',

    'cp.start': '起点',
    'cp.finish': '终点',
    'cp.startOf': '{name}（起点）',
    'cp.finishOf': '{name}（终点）',
    'cp.combined': '共用起终点',
    'cp.pass': '第 {pass} 次 · {km} km',
    'cp.positionLabel': '经过位置',
    'cp.positionAria': '{name}经过位置',
    'cp.positionPlaceholder': '请选择经过位置',
    'cp.offRoute': '确认偏离 {meters} m',
    'cp.stay': '停留 / 分钟',
    'cp.stayAria': '{name}停留分钟',
    'cp.cutoff': '关门 / H:MM',
    'cp.cutoffAria': '{name}关门用时',
    'cp.cutoffPlaceholder': '未设置',
    'cp.includeAria': '选择{name}',
    'cp.hintAmbiguous': '{names} 存在位置歧义，需要选择后再生成。',
    'cp.hintReady': '已识别路线内站点。默认不停站，原始名称与编号保留。',

    'style.paper': '山野纸张',
    'style.night': '夜跑仪表盘',
    'style.ink': '极简墨线',
    'style.map': '复古等高线',

    'result.stationKm': '{km} km',
    'result.cutoffBadge': '关门 {time}',
    'result.stayLine': '停留 {minutes} 分',
    'result.leaveLine': '出站 {clock}',
    'result.lateArrival': '到站超时',
    'result.lateDeparture': '出站超时',
    'result.statDistance': '路线距离',
    'result.statAscent': '累计爬升',
    'result.statDescent': '累计下降',
    'result.statEquivalent': '等效距离',
    'result.legend': '发枪 {start} · 主数字：到站钟点（当地时间） · 括号：{label}',
    'result.thStation': '站点 / 累计里程',
    'result.thSegment': '分段距离',
    'result.thSegmentUnit': 'km',
    'result.thGrade': '爬升 / 下降',
    'result.thGradeUnit': 'm',
    'result.thWater': '下一段水量',
    'result.thWaterUnit': 'ml · 比较值',
    'result.thTarget': '目标方案',
    'result.thReference': '参考方案',
    'result.noteElevationLabel': '高程处理：',
    'result.noteElevation': '{window} m 窗口平滑 + {threshold} m 峰谷反转阈值。',
    'result.noteElevationRepair': '已补齐 {count} 个缺失高程点，爬升为估计值。',
    'result.noteElevationClean': '高程未发现缺失。',
    'result.noteStopLabel': '停站：',
    'result.noteStop': '共 {minutes} 分钟，已包含在完赛时间中。',
    'result.noteCutoffLabel': '关门：',
    'result.noteCutoffUnchecked': '{count} 个站点未提供关门时间。',
    'result.noteCutoffChecked': '已按所填时间校核。',
    'result.noteReadLabel': '读表：',
    'result.noteRead': '主数字为到站钟点（当地时间），括号内为累计耗时。首行为发枪时间，末行为完赛钟点。有停留的站点另列出站钟点。',
    'result.noteWater': '水量按等效距离比较，非个人饮水建议。',
    'detail.ascent': '爬升系数：每爬升 100 m 增加 {factor} 等效 km；距离翻倍的平均配速增幅：{fatigue}%。',
    'detail.start': '发枪时间：{start}。时间为从发枪开始的累计用时；目标时间包含已配置停站。',
    'detail.water': '水量采用 {water} ml / 10 等效 km，仅用于比较下一段负担。',
    'detail.spacing': '水平路线保留原始路径，未缩放至文件名里程。最大原始点间距 {spacing} m。',
    'detail.model': '模型未计入技术路面、陡下坡额外负担、天气、拥堵与个人肌力差异。目标完赛时间不代表能力评估。',
    'detail.independent': '基于耐力学社（IEST）体感一致配速思路的独立实现，并非 RunArt.Net 官方输出。',
    'detail.confirmed': '这条路线沿用已确认的 CP10 第一次经过位置；如需更改，可在高级选项中选择。',
    'route.unnamed': '越野路线',
    'export.sheetName': '配速表',
    'repair.method': '中间缺口按距离线性插值，首尾使用最近有效高程；插值不是实测高程。',

    'svg.metadata': '发枪：{time}　时间均为比赛当地时间',
    'svg.water': '水量（ml）：{water} ml/10 等效公里，仅供赛段比较，非个人饮水建议',
    'svg.legendTop': '上行：到站钟点（当地时间）',
    'svg.legendElapsed': '下行：累计耗时（首行为发枪，末行为完赛）',
    'svg.legendPace': '下行：区间配速（分:秒/km）',
    'svg.legendEqPace': '下行：区间等效配速（分:秒/km）',
    'svg.headTotal': '累积',
    'svg.headTotalUnit': '距离',
    'svg.headGrade': '坡度',
    'svg.headGradeUnit': '分布',
    'svg.headProfile': '肖像图',
    'svg.headDistance': '距离',
    'svg.headAscent': '爬升',
    'svg.headDescent': '下降',
    'svg.headWater': '水',
    'svg.headPosition': '位置',
    'svg.headTarget': 'Target',
    'svg.title': '{name} 体感一致配速表',
    'svg.gradeTitle': '坡度按距离加权的七档分布',
    'svg.profileTitle': '分段海拔肖像，各段独立缩放',
    'svg.stopLine': '停留 {minutes} 分',
    'svg.leaveLine': '出站 {clock}',
    'svg.official': '官方 {km} km',
    'svg.cutoffLine': '关门 {time}',

    'field.ascent_smoothing_m': '高程平滑窗口',
    'field.ascent_threshold_m': '峰谷反转阈值',
    'field.ascent_km_per_100m': '爬升等效距离',
    'field.fatigue_rate': '距离翻倍配速增幅',
    'field.target_step_minutes': '相邻方案间隔',
    'field.rest_minutes': '停站时间',
    'field.distance_km': '站点距离',
    'field.target': '目标完赛时间',

    'status.modified': '设置已修改，点击“生成配速表”更新结果。',
    'status.reading': '正在读取路线、修复缺失高程并识别站点…',
    'status.ready': '路线已就绪：{km} km，爬升 {ascent} m。',
    'status.readyRepair': ' 已自动补齐 {count} 个缺失高程点。',
    'status.readyConfirmed': ' 已沿用这条路线的 CP10 第一次经过位置。',
    'status.generating': '正在按路线起伏分配时间…',
    'status.generated': '配速表已生成，时间与停站计算已核对。',
    'status.fileState': '{km} km · 爬升 {ascent} m',
    'status.fileHint': '{size} · 点击可更换路线',

    'err.not_gpx': '请选择 GPX 格式的路线。',
    'err.too_many_points': '轨迹超过 200000 个点，请先精简文件。',
    'err.no_track': 'GPX 中没有可用的轨迹。',
    'err.select_track': '文件包含多条路线，请在高级选项中选择。',
    'err.bad_track_index': '所选路线编号无效。',
    'err.too_few_points': '路线至少需要两个轨迹点。',
    'err.no_elevation': '整条路线缺少高程，无法估计爬升。请上传带高程的 GPX。',
    'err.bad_coords': 'GPX 经纬度无效。',
    'err.disconnected': 'GPX 包含不连续的轨迹段，请选择连续路线。',
    'err.too_few_locations': '路线至少需要两个不同的轨迹位置。',
    'err.route_too_long': '路线过长，采样点超过 2000000 个。',
    'err.window_small': '高程窗口过小，请增大窗口或设为 0。',
    'err.option_unknown': '包含不支持的高级选项。',
    'err.option_range': '参数“{field}”超出允许范围。',
    'err.bad_time': '时间格式应为 H:MM，例如 12:00。',
    'err.station_name': '每个站点都需要名称。',
    'err.manual_empty': '手动站点不能为空。',
    'err.manual_conflict': '手动站点不能同时使用站点选择。',
    'err.finish_mismatch': '终点里程与路线不一致。',
    'err.cp_order': '站点累计里程必须递增，且不能重复。',
    'err.cp_selection': '站点选择无效。',
    'err.cp_unknown': '站点编号无效。',
    'err.no_selection': '请在高级选项中选择站点或添加手动站点。',
    'err.cp_override': '站点设置引用了未选中的站点。',
    'err.start_far': '共用起终点距离路线端点超过 100 m，请确认站点位置。',
    'err.start_offset': '起点距路线超过 100 m，请确认站点位置。',
    'err.finish_offset': '终点距路线超过 100 m，请确认站点位置。',
    'err.cp_over_total': '站点位置超过路线终点。',
    'err.cp_ambiguous': '{name} 有多个经过位置，请在高级选项中选择。',
    'err.cp_off_route': '{name} 距路线超过 100 m，请在高级选项中确认。',
    'err.start_rest': '起终点停站时间必须为 0。',
    'err.secondary': '表格显示方式无效。',
    'err.start_time': '发枪时间格式应为 HH:MM，例如 06:00。',
    'err.step': '方案间隔必须大于 0。',
    'err.targets_empty': '目标方案不能为空。',
    'err.targets_invalid': '方案时间必须大于 0 且不能重复。短目标可在高级选项中选择“仅目标方案”。',
    'err.rest_over': '目标完赛时间必须大于全部停站时间。',
    'err.unknown': '计算未能完成，请重试。',
    'err.unknown_language': '语言设置无效。',

    'error.noFile': '先选择你的 GPX 路线文件。',
    'error.missingFile': '请选择一个 GPX 文件。',
    'error.dtd': '不支持包含 DTD 或实体声明的 GPX。',
    'error.notXml': '文件不是有效的 GPX XML，请重新导出路线。',
    'error.tooManyPoints': '轨迹超过 200000 个点，请先精简文件。',
    'error.ext': '请选择 .gpx 格式的路线文件。',
    'error.tooBig': 'GPX 文件不能超过 12 MB。',
    'error.empty': 'GPX 文件为空，请重新选择。',
    'error.readFailed': '文件读取失败，请重新选择。',
    'error.cancelled': '已取消旧路线的读取。',
    'error.timeout': '处理超时，请精简 GPX 后重试，已选路线会保留。',
    'error.worker': '浏览器计算模块未能启动，请刷新页面后重试。',
    'error.targetFormat': '完赛时间使用 H:MM 格式，例如 12:00。时间必须大于 0。',
    'error.startRequired': '填写发枪时间后再生成，例如 06:00。使用比赛当地时间。',
    'error.optionNumber': '请检查“{field}”的数值。',
    'error.selectStation': '请至少选择一个路线站点。',
    'error.choosePosition': '请选择 {name} 的经过位置。',
    'error.confirmOffset': '请确认 {name} 的偏离位置，或取消该站点。',
    'error.checkRest': '请检查 {name} 的停留时间。',
    'error.cutoffFormat': '{name} 关门时间应使用 H:MM 格式。',
    'error.manualLine': '手动站点第 {line} 行：名称和累计里程无效，里程应位于起终点之间。',
    'error.manualRest': '手动站点第 {line} 行：停留分钟无效。',
    'error.exportPng': 'PNG 导出未完成，请使用 SVG 下载。',
    'error.download': '下载未完成，请重试。',
    'error.wallpaperPng': 'PNG 导出未完成，请改用 SVG 下载。',
    'error.wallpaperDownload': '壁纸下载未完成，请重试。',

    'wall.errRange': '{label}应在 {min} 至 {max} 之间。',
    'wall.errPadding': '上下留白合计不能超过 85%。',
    'wall.errMissing': '缺少原版配速表图片，重新生成后再导出。',
    'wall.labelWidth': '宽度',
    'wall.labelHeight': '高度',
    'wall.labelTop': '顶部留白',
    'wall.labelBottom': '底部留白'
  };

  const en = {
    'page.title': 'Trail Notes · Even-Effort Pace Sheet',
    'page.description': 'Upload a GPX, set the finish time and the start time, and get an even-effort trail pace sheet.',

    'brand.name': 'Trail Notes',
    'brand.tag': '山野有数',
    'brand.home': 'Trail Notes home',
    'header.note': 'One route, one plan for the hills.',
    'lang.group': 'Language',
    'lang.zh': 'ZH',
    'lang.en': 'EN',

    'hero.eyebrow': 'Sketch a plan for the next start line',
    'hero.title1': 'The trail runs steep,',
    'hero.title2': 'the rhythm you keep.',
    'hero.desc1': 'An even-effort pace sheet for trail races.',
    'hero.desc2': 'Bring your route. Leave the math to us.',
    'hero.labelSummit': 'Slow still counts.',
    'hero.labelRoute': 'your trail, your rhythm',
    'hero.stamp': 'Find your<br>rhythm',

    'planner.title': 'Put the route here',
    'planner.pencil': 'route · time · start ↘',
    'form.step1': 'Your route',
    'form.dropTitle': 'Drop a GPX route file',
    'form.dropHint': 'or click to choose · GPX, up to 12 MB',
    'form.dropAria': 'Choose or drop a GPX route file',
    'form.privacy': 'The GPX stays in this browser. Nothing is uploaded.',
    'form.privacyCached': 'The GPX stays in this browser. The page is cached, so it also works offline.',
    'form.step2': 'Target finish time',
    'form.durationUnit': 'hours : minutes',
    'form.timeHint': 'Give the finish a time that fits your rhythm.',
    'form.targetNote': 'Five options · 30 min apart',
    'form.targetNoteStep': 'Five options · {minutes} min apart',
    'form.targetNoteOne': 'Target option only',
    'form.step3': 'Start time',
    'form.required': 'required',
    'form.startHint': 'Race-local time. Used for arrival clocks and day changes.',
    'form.footer1': 'Save your legs for the hills. ',
    'form.footer2': 'Leave the math here.',
    'form.generate': 'Generate pace sheet',
    'form.generating': 'Working out the rhythm…',
    'form.inspecting': 'Reading the route…',

    'advanced.title': 'Advanced options',
    'advanced.titleAlt': '高级选项',
    'advanced.defaults': 'Defaults are already set',
    'advanced.intro': 'Defaults are enough. After changing a value, press Generate to update.',
    'advanced.track': 'Choose route',
    'advanced.smooth': 'Elevation smoothing window',
    'advanced.threshold': 'Reversal threshold',
    'advanced.ascentFactor': 'Ascent equivalent distance',
    'advanced.fatigue': 'Pace increase per distance doubling',
    'advanced.step': 'Option spacing',
    'advanced.minutes': 'min',
    'advanced.bracket': 'Bracket shows',
    'advanced.options': 'Options',
    'option.arrival': 'Arrival clock (local)',
    'option.pace': 'Segment pace (min:sec/km)',
    'option.eqPace': 'Segment equivalent pace (min:sec/km)',
    'option.five': 'Five options',
    'option.one': 'Target only',
    'advanced.repairTitle': 'Missing elevation is filled in',
    'advanced.repairBody': 'Gaps in the middle are interpolated by distance; the ends use the nearest valid elevation. The result shows how many points were repaired. If all elevations are missing, calculation stops.',
    'advanced.cpTitle': 'Stations and stops',
    'advanced.cpSub': 'Cutoff is elapsed time from the start gun',
    'advanced.manualTitle': 'Manual stations (optional)',
    'advanced.manualBody': 'With no recognised stations, only start and finish are listed. Each line: name, cumulative km, stop minutes, cutoff. The finish is added automatically.',
    'advanced.manualAria': 'Manual stations',
    'advanced.manualPlaceholder': 'Aid station,10.5,5,03:00',

    'underForm.left': 'Even effort · pace adapts to the terrain',
    'underForm.right': 'Every climb deserves a plan.',

    'results.eyebrow': 'YOUR TRAIL PLAN / PACE CHART',
    'results.title': 'Your trail rhythm',
    'results.exportsAria': 'Download the pace sheet',
    'results.wallpaper': 'Wallpaper',
    'results.print': 'Print',
    'results.colorLabel': 'Chart colors',
    'results.profileTitle': 'Along the route',
    'results.profileSub': 'Elevation profile · 100 m smoothed, illustrative only',
    'results.chartAria': 'Route elevation profile',
    'results.tableAria': 'Pace table, scrolls sideways',
    'results.mobileHint': 'Swipe sideways for all options →',
    'results.notesTitle': 'Method notes and route hints',

    'wall.eyebrow': 'HOME SCREEN / WALLPAPER',
    'wall.title': 'Put the pace sheet on your phone',
    'wall.desc': 'The exported sheet scaled down, with padding above and below. Every station and option is kept.',
    'wall.device': 'Device',
    'wall.layout': 'Layout',
    'wall.landscape': 'Landscape · table turned 90°, full screen width',
    'wall.portrait': 'Portrait · table stays upright',
    'wall.top': 'Top margin %',
    'wall.bottom': 'Bottom margin %',
    'wall.theme': 'Background',
    'wall.dark': 'Dark',
    'wall.light': 'Light',
    'wall.width': 'Width px',
    'wall.height': 'Height px',
    'wall.overlay': 'Overlay a lock-screen preview',
    'wall.download': 'Download wallpaper PNG',
    'wall.boardLandscape': 'Landscape',
    'wall.boardPortrait': 'Portrait',
    'wall.note': '{board} · {width} × {height} px. {tip}The full sheet is kept; the preview overlay is not exported. Open notifications can still cover the table, so hide them or add bottom margin.',
    'wall.tipShare': 'The sheet fills {share}% of the screen height. ',
    'wall.tipRotate': 'In portrait the table is limited by screen width and fills {share}%; landscape would fill {other}%. ',
    'wall.exporting': 'Exporting…',
    'wall.maskDate': 'Friday, Nov 13',
    'wall.device.iphone-61': 'iPhone 15 / 15 Pro (6.1 in)',
    'wall.device.iphone-67': 'iPhone 15 Plus / Pro Max (6.7 in)',
    'wall.device.iphone-69': 'iPhone 16 Pro Max (6.9 in)',
    'wall.device.iphone-16pro': 'iPhone 16 Pro (6.3 in)',
    'wall.device.android-1080': 'Android',
    'wall.device.custom': 'Custom size',
    'wall.fileSuffix': '{name}-wallpaper-{device}-{board}',

    'footer.left': 'Trail Notes × every step counts.',
    'footer.right': 'An independent even-effort implementation',

    'time.nextDay': 'Next day',
    'time.daysLater': '+{days} days',
    'time.start': 'Start',
    'time.arrival': 'Arrival',
    'time.finish': 'Finish',
    'time.pace': 'Pace',
    'time.eqPace': 'Eq. pace',
    'time.elapsed': 'Elapsed',

    'cp.start': 'Start',
    'cp.finish': 'Finish',
    'cp.startOf': '{name} (start)',
    'cp.finishOf': '{name} (finish)',
    'cp.combined': 'Shared start and finish',
    'cp.pass': 'Pass {pass} · {km} km',
    'cp.positionLabel': 'Pass',
    'cp.positionAria': 'Pass position for {name}',
    'cp.positionPlaceholder': 'Choose a pass',
    'cp.offRoute': 'Confirm {meters} m off route',
    'cp.stay': 'Stop / min',
    'cp.stayAria': 'Stop minutes for {name}',
    'cp.cutoff': 'Cutoff / H:MM',
    'cp.cutoffAria': 'Cutoff time for {name}',
    'cp.cutoffPlaceholder': 'Not set',
    'cp.includeAria': 'Include {name}',
    'cp.hintAmbiguous': '{names} has more than one possible position. Choose one before generating.',
    'cp.hintReady': 'Stations found inside the route. No stops by default; original names and numbers are kept.',

    'style.paper': 'Field paper',
    'style.night': 'Night dashboard',
    'style.ink': 'Ink lines',
    'style.map': 'Vintage contours',

    'result.stationKm': '{km} km',
    'result.cutoffBadge': 'Cutoff {time}',
    'result.stayLine': 'Stop {minutes} min',
    'result.leaveLine': 'Leave {clock}',
    'result.lateArrival': 'Late arrival',
    'result.lateDeparture': 'Late departure',
    'result.statDistance': 'Route distance',
    'result.statAscent': 'Total ascent',
    'result.statDescent': 'Total descent',
    'result.statEquivalent': 'Equivalent distance',
    'result.legend': 'Start {start} · main number: arrival clock (local time) · bracket: {label}',
    'result.thStation': 'Station / cumulative',
    'result.thSegment': 'Segment',
    'result.thSegmentUnit': 'km',
    'result.thGrade': 'Ascent / descent',
    'result.thGradeUnit': 'm',
    'result.thWater': 'Water for next leg',
    'result.thWaterUnit': 'ml · comparison',
    'result.thTarget': 'Target',
    'result.thReference': 'Option',
    'result.noteElevationLabel': 'Elevation: ',
    'result.noteElevation': '{window} m window smoothing plus {threshold} m reversal threshold. ',
    'result.noteElevationRepair': '{count} missing elevation points were filled in, so ascent is an estimate.',
    'result.noteElevationClean': 'No elevation was missing.',
    'result.noteStopLabel': 'Stops: ',
    'result.noteStop': '{minutes} minutes in total, already inside the finish time. ',
    'result.noteCutoffLabel': 'Cutoffs: ',
    'result.noteCutoffUnchecked': '{count} stations have no cutoff time. ',
    'result.noteCutoffChecked': 'Checked against the times you gave. ',
    'result.noteReadLabel': 'Reading the table: ',
    'result.noteRead': 'The main number is the arrival clock (local time); the bracket holds elapsed time. The first row is the start gun and the last row is the finish. Stations with a stop also list the departure clock.',
    'result.noteWater': 'Water compares equivalent distance; it is not personal drinking advice.',
    'detail.ascent': 'Ascent factor: each 100 m of climb adds {factor} equivalent km. Average pace increase when distance doubles: {fatigue}%.',
    'detail.start': 'Start time: {start}. Times are elapsed from the start gun; the target time includes the configured stops.',
    'detail.water': 'Water uses {water} ml per 10 equivalent km, only to compare the next leg.',
    'detail.spacing': 'The horizontal route keeps the original path; it is not scaled to the distance in the file name. Largest original point gap: {spacing} m.',
    'detail.model': 'The model ignores technical ground, extra cost of steep descents, weather, congestion and personal strength. The target time is not a fitness assessment.',
    'detail.independent': 'An independent implementation of the even-effort idea from the Institute of Endurance Science and Technology (IEST). It is not official RunArt.Net output.',
    'detail.confirmed': 'This route keeps the confirmed first pass of CP10. Change it in Advanced options.',
    'route.unnamed': 'Trail route',
    'export.sheetName': 'pace-sheet',
    'repair.method': 'Interior gaps are linearly interpolated by distance; the ends use the nearest valid elevation. Interpolated values are not measurements.',

    'svg.metadata': 'Start: {time}　all times are race-local',
    'svg.water': 'Water (ml): {water} ml per 10 equivalent km, for segment comparison only',
    'svg.legendTop': 'Top: arrival clock (local time)',
    'svg.legendElapsed': 'Bottom: elapsed time (first row start, last row finish)',
    'svg.legendPace': 'Bottom: segment pace (min:sec/km)',
    'svg.legendEqPace': 'Bottom: segment equivalent pace (min:sec/km)',
    'svg.headTotal': 'Total',
    'svg.headTotalUnit': 'km',
    'svg.headGrade': 'Grade',
    'svg.headGradeUnit': 'mix',
    'svg.headProfile': 'Profile',
    'svg.headDistance': 'km',
    'svg.headAscent': 'Up',
    'svg.headDescent': 'Down',
    'svg.headWater': 'Water',
    'svg.headPosition': 'Station',
    'svg.headTarget': 'Target',
    'svg.title': '{name} even-effort pace sheet',
    'svg.gradeTitle': 'Distance-weighted grade mix in seven bands',
    'svg.profileTitle': 'Segment elevation portrait, each segment scaled on its own',
    'svg.stopLine': 'Stop {minutes} min',
    'svg.leaveLine': 'Leave {clock}',
    'svg.official': 'Official {km} km',
    'svg.cutoffLine': 'Cutoff {time}',

    'field.ascent_smoothing_m': 'elevation smoothing window',
    'field.ascent_threshold_m': 'reversal threshold',
    'field.ascent_km_per_100m': 'ascent equivalent distance',
    'field.fatigue_rate': 'pace increase per doubling',
    'field.target_step_minutes': 'option spacing',
    'field.rest_minutes': 'stop minutes',
    'field.distance_km': 'station distance',
    'field.target': 'target finish time',

    'status.modified': 'Settings changed. Press Generate to update the result.',
    'status.reading': 'Reading the route, filling missing elevation and finding stations…',
    'status.ready': 'Route ready: {km} km, {ascent} m of ascent.',
    'status.readyRepair': ' {count} missing elevation points were filled in.',
    'status.readyConfirmed': ' The confirmed first pass of CP10 is applied.',
    'status.generating': 'Distributing the time over the terrain…',
    'status.generated': 'Pace sheet ready. Times and stops are checked.',
    'status.fileState': '{km} km · {ascent} m ascent',
    'status.fileHint': '{size} · click to change the route',

    'err.not_gpx': 'Choose a GPX route file.',
    'err.too_many_points': 'The track has more than 200000 points. Simplify the file first.',
    'err.no_track': 'The GPX has no usable track.',
    'err.select_track': 'The file has several routes. Choose one in Advanced options.',
    'err.bad_track_index': 'That route number is not valid.',
    'err.too_few_points': 'A route needs at least two track points.',
    'err.no_elevation': 'The whole route has no elevation, so ascent cannot be estimated. Upload a GPX with elevation.',
    'err.bad_coords': 'The GPX has an invalid latitude or longitude.',
    'err.disconnected': 'The GPX has disconnected segments. Choose a continuous route.',
    'err.too_few_locations': 'A route needs at least two different positions.',
    'err.route_too_long': 'The route is too long: more than 2000000 samples.',
    'err.window_small': 'The smoothing window is too small. Increase it or set 0.',
    'err.option_unknown': 'An unsupported advanced option was sent.',
    'err.option_range': 'Option “{field}” is out of range.',
    'err.bad_time': 'Use H:MM, for example 12:00.',
    'err.station_name': 'Every station needs a name.',
    'err.manual_empty': 'Manual stations cannot be empty.',
    'err.manual_conflict': 'Manual stations cannot be combined with selected stations.',
    'err.finish_mismatch': 'The finish distance does not match the route.',
    'err.cp_order': 'Station distances must increase and cannot repeat.',
    'err.cp_selection': 'The station selection is not valid.',
    'err.cp_unknown': 'That station number is not valid.',
    'err.no_selection': 'Choose stations, or add manual ones, in Advanced options.',
    'err.cp_override': 'A station setting refers to a station that is not selected.',
    'err.start_far': 'The shared start and finish are more than 100 m from the route ends. Check the station position.',
    'err.start_offset': 'The start is more than 100 m from the route. Check the station position.',
    'err.finish_offset': 'The finish is more than 100 m from the route. Check the station position.',
    'err.cp_over_total': 'A station is beyond the end of the route.',
    'err.cp_ambiguous': '{name} has more than one possible position. Choose one in Advanced options.',
    'err.cp_off_route': '{name} is more than 100 m from the route. Confirm it in Advanced options.',
    'err.start_rest': 'Start and finish stops must be 0.',
    'err.secondary': 'That bracket display is not valid.',
    'err.start_time': 'Use HH:MM for the start time, for example 06:00.',
    'err.step': 'The option spacing must be greater than 0.',
    'err.targets_empty': 'The target list cannot be empty.',
    'err.targets_invalid': 'Option times must be greater than 0 and cannot repeat. For a short target, choose "Target only" in Advanced options.',
    'err.rest_over': 'The target finish time must be longer than all stops together.',
    'err.unknown': 'The calculation did not finish. Try again.',
    'err.unknown_language': 'That language setting is not valid.',

    'error.noFile': 'Choose your GPX route file first.',
    'error.missingFile': 'Choose a GPX file.',
    'error.dtd': 'GPX files with DTD or entity declarations are not supported.',
    'error.notXml': 'The file is not valid GPX XML. Export the route again.',
    'error.tooManyPoints': 'The track has more than 200000 points. Simplify the file first.',
    'error.ext': 'Choose a file with the .gpx extension.',
    'error.tooBig': 'The GPX file cannot be larger than 12 MB.',
    'error.empty': 'The GPX file is empty. Choose another file.',
    'error.readFailed': 'The file could not be read. Choose it again.',
    'error.cancelled': 'Reading the previous route was cancelled.',
    'error.timeout': 'This took too long. Simplify the GPX and try again; your file is kept.',
    'error.worker': 'The browser calculation module did not start. Reload the page and try again.',
    'error.targetFormat': 'Use H:MM for the finish time, for example 12:00. The time must be greater than 0.',
    'error.startRequired': 'Enter the start time before generating, for example 06:00. Use race-local time.',
    'error.optionNumber': 'Check the value of “{field}”.',
    'error.selectStation': 'Choose at least one station.',
    'error.choosePosition': 'Choose the pass position for {name}.',
    'error.confirmOffset': 'Confirm the offset for {name}, or clear that station.',
    'error.checkRest': 'Check the stop minutes for {name}.',
    'error.cutoffFormat': 'Use H:MM for the {name} cutoff.',
    'error.manualLine': 'Manual station line {line}: the name or distance is not valid. The distance must sit between start and finish.',
    'error.manualRest': 'Manual station line {line}: the stop minutes are not valid.',
    'error.exportPng': 'PNG export did not finish. Download the SVG instead.',
    'error.download': 'The download did not finish. Try again.',
    'error.wallpaperPng': 'PNG export did not finish. Download the SVG instead.',
    'error.wallpaperDownload': 'The wallpaper download did not finish. Try again.',

    'wall.errRange': '{label} must be between {min} and {max}.',
    'wall.errPadding': 'Top and bottom margins together cannot exceed 85%.',
    'wall.errMissing': 'The pace sheet image is missing. Generate the sheet again before exporting.',
    'wall.labelWidth': 'Width',
    'wall.labelHeight': 'Height',
    'wall.labelTop': 'Top margin',
    'wall.labelBottom': 'Bottom margin'
  };

  const MESSAGES = {zh, en};
  const SUPPORTED = ['zh', 'en'];
  const STORAGE_KEY = 'trail-pacer-lang';
  const listeners = [];

  function normalize(code) {
    if (!code) return null;
    const value = String(code).trim().toLowerCase();
    if (!value) return null;
    if (value.startsWith('zh')) return 'zh';
    if (value.startsWith('en')) return 'en';
    return 'en';
  }

  function readSaved() {
    try { return normalize(globalThis.localStorage?.getItem(STORAGE_KEY)); } catch (error) { return null; }
  }

  function save(code) {
    try { globalThis.localStorage?.setItem(STORAGE_KEY, code); } catch (error) { /* private mode */ }
  }

  /* Order: ?lang=, stored choice, browser language, then Chinese. */
  function detect(search, nav) {
    const match = /[?&]lang=([^&]+)/.exec(search || '');
    if (match) {
      const asked = normalize(decodeURIComponent(match[1]).replace(/\+/g, ' '));
      if (asked) return asked;
    }
    const saved = readSaved();
    if (saved) return saved;
    const asked = nav ? (nav.languages && nav.languages[0]) || nav.language : '';
    return normalize(asked) || 'zh';
  }

  let current = typeof document !== 'undefined'
    ? detect(globalThis.location?.search, globalThis.navigator)
    : 'zh';

  function t(key, params, lang) {
    const table = MESSAGES[lang] || MESSAGES[current] || MESSAGES.zh;
    let value = table[key];
    if (value === undefined) value = MESSAGES.zh[key];
    if (value === undefined) return key;
    if (!params) return value;
    return value.replace(/\{(\w+)\}/g, (whole, name) => (params[name] === undefined ? whole : String(params[name])));
  }

  function forLang(lang) { return (key, params) => t(key, params, SUPPORTED.includes(lang) ? lang : undefined); }

  function lang() { return current; }

  function htmlLang(code) { return code === 'en' ? 'en' : 'zh-CN'; }

  function setLang(code, options = {}) {
    const next = SUPPORTED.includes(code) ? code : normalize(code) || 'zh';
    const changed = next !== current;
    current = next;
    if (options.persist !== false) save(next);
    if (typeof document !== 'undefined') {
      document.documentElement.lang = htmlLang(next);
      document.title = t('page.title');
      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.content = t('page.description');
      apply(document);
      for (const node of document.querySelectorAll('[data-lang-button]')) {
        node.setAttribute('aria-pressed', String(node.dataset.langButton === next));
      }
      if (options.persist !== false && globalThis.location && globalThis.history?.replaceState) {
        const url = new URL(globalThis.location.href);
        url.searchParams.set('lang', next);
        globalThis.history.replaceState(null, '', url.href);
      }
    }
    if (changed && options.notify !== false) for (const fn of listeners) fn(next);
    return next;
  }

  function onChange(fn) { listeners.push(fn); }

  function apply(scope) {
    const host = scope || (typeof document !== 'undefined' ? document : null);
    if (!host || !host.querySelectorAll) return;
    for (const node of host.querySelectorAll('[data-i18n]')) node.textContent = t(node.dataset.i18n);
    for (const node of host.querySelectorAll('[data-i18n-html]')) node.innerHTML = t(node.dataset.i18nHtml);
    for (const node of host.querySelectorAll('[data-i18n-placeholder]')) node.placeholder = t(node.dataset.i18nPlaceholder);
    for (const node of host.querySelectorAll('[data-i18n-aria]')) node.setAttribute('aria-label', t(node.dataset.i18nAria));
    for (const node of host.querySelectorAll('[data-i18n-title]')) node.title = t(node.dataset.i18nTitle);
  }

  /* Stations named by the engine carry a kind so start and finish follow the language. */
  const SUFFIX = /^(.+?)（(起点|终点)）$/;
  function checkpointName(cp, lang) {
    const kind = cp && cp.kind;
    if (kind === 'start') return cp.baseName ? t('cp.startOf', {name: cp.baseName}, lang) : t('cp.start', {}, lang);
    if (kind === 'finish') return cp.baseName ? t('cp.finishOf', {name: cp.baseName}, lang) : t('cp.finish', {}, lang);
    const name = String((cp && cp.name) || '');
    const match = SUFFIX.exec(name);
    if (match) return match[2] === '起点' ? t('cp.startOf', {name: match[1]}, lang) : t('cp.finishOf', {name: match[1]}, lang);
    return name;
  }

  const api = {MESSAGES, SUPPORTED, t, forLang, lang, setLang, onChange, apply, detect, normalize, checkpointName, htmlLang, STORAGE_KEY};
  root.TrailI18n = api;
  if (typeof module !== 'undefined') module.exports = api;
})(globalThis);
