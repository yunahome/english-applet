// 生成题库 Excel：题库/duolingo-题库.xlsx
// 用法：node scripts/create_question_bank.cjs
const XLSX = require('xlsx')
const path = require('path')
const fs = require('fs')

// ---------- 8 个单元规划 ----------
const UNITS = [
  ['unit-1', '第 1 单元 · 入门核心 100 词', '#58CC02', '问候/称谓/家居/数字/颜色/食物/动物/身体/动作/形容词'],
  ['unit-2', '第 2 单元 · 家庭与朋友', '#1CB0F6', '家庭成员/朋友/外貌/性格/爱好'],
  ['unit-3', '第 3 单元 · 学校与学习', '#CE82FF', '文具/科目/课堂/考试/时间'],
  ['unit-4', '第 4 单元 · 饮食与健康', '#FF9600', '三餐/水果蔬菜/味道/健康/运动'],
  ['unit-5', '第 5 单元 · 购物与金钱', '#FFC800', '商店/衣物/价格/数字进阶/砍价'],
  ['unit-6', '第 6 单元 · 城市与出行', '#FF4B4B', '交通/问路/地点/天气/公共场所'],
  ['unit-7', '第 7 单元 · 工作与职业', '#2B70C9', '职业/办公室/技能/求职/日常安排'],
  ['unit-8', '第 8 单元 · 旅行与世界', '#4CB786', '旅行/国家/酒店/方向/文化']
]

// ---------- 第一单元：100 关（每关 1 词 + 1 例句，10 词一主题） ----------
// [英文, 中文, 例句, 例句中文, 主题]
const U1 = [
  // 问候 Greetings (1-10)
  ['hello', '你好', 'Hello, I am Li Lei.', '你好，我是李雷。', '问候'],
  ['hi', '嗨', 'Hi, nice to meet you.', '嗨，很高兴见到你。', '问候'],
  ['good morning', '早上好', 'Good morning, teacher.', '早上好，老师。', '问候'],
  ['good night', '晚安', 'Good night, Mom.', '晚安，妈妈。', '问候'],
  ['goodbye', '再见', 'Goodbye, my friend.', '再见，我的朋友。', '问候'],
  ['thank you', '谢谢', 'Thank you very much.', '非常感谢你。', '问候'],
  ['sorry', '对不起', 'I am sorry, I am late.', '对不起，我迟到了。', '问候'],
  ['please', '请', 'Please open the door.', '请打开门。', '问候'],
  ['welcome', '欢迎', 'Welcome to my home.', '欢迎来我家。', '问候'],
  ['excuse me', '打扰一下', 'Excuse me, where is the bus?', '打扰一下，公交车在哪里？', '问候'],
  // 称谓与人 (11-20)
  ['friend', '朋友', 'He is my best friend.', '他是我最好的朋友。', '称谓'],
  ['mother', '妈妈', 'My mother is a doctor.', '我的妈妈是医生。', '称谓'],
  ['father', '爸爸', 'My father likes sports.', '我爸爸喜欢运动。', '称谓'],
  ['brother', '哥哥', 'My brother is ten years old.', '我哥哥十岁。', '称谓'],
  ['sister', '妹妹', 'My sister loves music.', '我妹妹热爱音乐。', '称谓'],
  ['teacher', '老师', 'The teacher is very kind.', '这位老师非常和善。', '称谓'],
  ['student', '学生', 'I am a student.', '我是一名学生。', '称谓'],
  ['boy', '男孩', 'The boy is tall.', '这个男孩个子高。', '称谓'],
  ['girl', '女孩', 'The girl has a cat.', '这个女孩有一只猫。', '称谓'],
  ['name', '名字', 'My name is Ann.', '我的名字叫安。', '称谓'],
  // 家居 (21-30)
  ['home', '家', 'I go home at six.', '我六点回家。', '家居'],
  ['room', '房间', 'My room is clean.', '我的房间很干净。', '家居'],
  ['door', '门', 'Please close the door.', '请关门。', '家居'],
  ['window', '窗户', 'The window is open.', '窗户开着。', '家居'],
  ['table', '桌子', 'The book is on the table.', '书在桌子上。', '家居'],
  ['chair', '椅子', 'This chair is soft.', '这把椅子很软。', '家居'],
  ['bed', '床', 'The cat sleeps on the bed.', '猫在床上睡觉。', '家居'],
  ['light', '灯', 'Turn on the light, please.', '请开灯。', '家居'],
  ['key', '钥匙', 'I can not find my key.', '我找不到钥匙了。', '家居'],
  ['clock', '时钟', 'The clock is on the wall.', '时钟挂在墙上。', '家居'],
  // 数字 (31-40)
  ['one', '一', 'I have one apple.', '我有一个苹果。', '数字'],
  ['two', '二', 'Two dogs run in the park.', '两只狗在公园里跑。', '数字'],
  ['three', '三', 'Three birds sing.', '三只鸟在唱歌。', '数字'],
  ['four', '四', 'The box has four sides.', '这个盒子有四个面。', '数字'],
  ['five', '五', 'Five stars in the sky.', '天上有五颗星。', '数字'],
  ['six', '六', 'She is six years old.', '她六岁了。', '数字'],
  ['seven', '七', 'A week has seven days.', '一周有七天。', '数字'],
  ['eight', '八', 'Eight students are here.', '八个学生在这里。', '数字'],
  ['nine', '九', 'Nine cups on the table.', '桌上有九个杯子。', '数字'],
  ['ten', '十', 'I can count to ten.', '我能数到十。', '数字'],
  // 颜色 (41-50)
  ['red', '红色', 'The apple is red.', '苹果是红色的。', '颜色'],
  ['blue', '蓝色', 'The sky is blue.', '天空是蓝色的。', '颜色'],
  ['green', '绿色', 'The leaves are green.', '树叶是绿色的。', '颜色'],
  ['yellow', '黄色', 'The banana is yellow.', '香蕉是黄色的。', '颜色'],
  ['black', '黑色', 'The cat is black.', '这只猫是黑色的。', '颜色'],
  ['white', '白色', 'The snow is white.', '雪是白色的。', '颜色'],
  ['orange', '橙色', 'I like orange juice.', '我喜欢橙汁。', '颜色'],
  ['pink', '粉色', 'She has a pink bag.', '她有一个粉色书包。', '颜色'],
  ['brown', '棕色', 'The dog is brown.', '这只狗是棕色的。', '颜色'],
  ['color', '颜色', 'What is your favorite color?', '你最喜欢什么颜色？', '颜色'],
  // 食物 (51-60)
  ['apple', '苹果', 'I eat an apple every day.', '我每天吃一个苹果。', '食物'],
  ['banana', '香蕉', 'Monkeys love bananas.', '猴子爱香蕉。', '食物'],
  ['bread', '面包', 'I eat bread for breakfast.', '我早餐吃面包。', '食物'],
  ['milk', '牛奶', 'Drink milk every morning.', '每天早晨喝牛奶。', '食物'],
  ['water', '水', 'I want some water.', '我想要一些水。', '食物'],
  ['rice', '米饭', 'We eat rice at noon.', '我们中午吃米饭。', '食物'],
  ['egg', '鸡蛋', 'The egg is in the box.', '鸡蛋在盒子里。', '食物'],
  ['cake', '蛋糕', 'The cake is sweet.', '蛋糕是甜的。', '食物'],
  ['fish', '鱼', 'I like to eat fish.', '我喜欢吃鱼。', '食物'],
  ['tea', '茶', 'Grandpa drinks tea.', '爷爷喝茶。', '食物'],
  // 动物 (61-70)
  ['cat', '猫', 'The cat is sleeping.', '猫在睡觉。', '动物'],
  ['dog', '狗', 'My dog can swim.', '我的狗会游泳。', '动物'],
  ['bird', '鸟', 'A bird sings in the tree.', '一只鸟在树上唱歌。', '动物'],
  ['rabbit', '兔子', 'The rabbit eats carrots.', '兔子吃胡萝卜。', '动物'],
  ['pig', '猪', 'The pig is big.', '这头猪很大。', '动物'],
  ['horse', '马', 'The horse runs fast.', '马跑得很快。', '动物'],
  ['monkey', '猴子', 'The monkey likes bananas.', '猴子喜欢香蕉。', '动物'],
  ['bear', '熊', 'The bear sleeps in winter.', '熊在冬天睡觉。', '动物'],
  ['tiger', '老虎', 'The tiger is strong.', '老虎很强壮。', '动物'],
  ['panda', '熊猫', 'The panda eats bamboo.', '熊猫吃竹子。', '动物'],
  // 身体 (71-80)
  ['head', '头', 'My head hurts.', '我头疼。', '身体'],
  ['hand', '手', 'Wash your hands, please.', '请洗手。', '身体'],
  ['eye', '眼睛', 'Her eyes are big.', '她的眼睛很大。', '身体'],
  ['ear', '耳朵', 'I hear with my ears.', '我用耳朵听。', '身体'],
  ['nose', '鼻子', 'The dog has a wet nose.', '狗的鼻子是湿的。', '身体'],
  ['mouth', '嘴巴', 'Open your mouth.', '张开你的嘴。', '身体'],
  ['foot', '脚', 'My left foot hurts.', '我左脚疼。', '身体'],
  ['hair', '头发', 'She has long hair.', '她留着长发。', '身体'],
  ['face', '脸', 'Wash your face in the morning.', '早晨要洗脸。', '身体'],
  ['tooth', '牙齿', 'The baby has one tooth.', '婴儿有一颗牙。', '身体'],
  // 动作 (81-90)
  ['eat', '吃', 'We eat lunch together.', '我们一起吃午饭。', '动作'],
  ['drink', '喝', 'I drink water after sports.', '运动后我喝水。', '动作'],
  ['run', '跑', 'I run in the park.', '我在公园里跑步。', '动作'],
  ['walk', '走', 'I walk to school.', '我走路去学校。', '动作'],
  ['read', '读', 'I read books at night.', '我晚上读书。', '动作'],
  ['write', '写', 'Write your name here.', '在这里写下你的名字。', '动作'],
  ['sleep', '睡觉', 'I sleep at ten.', '我十点睡觉。', '动作'],
  ['play', '玩', 'We play football.', '我们踢足球。', '动作'],
  ['sing', '唱歌', 'Birds sing in the morning.', '鸟儿早晨唱歌。', '动作'],
  ['swim', '游泳', 'Fish can swim.', '鱼会游泳。', '动作'],
  // 形容词 (91-100)
  ['big', '大的', 'The elephant is big.', '大象很大。', '形容词'],
  ['small', '小的', 'The ant is small.', '蚂蚁很小。', '形容词'],
  ['tall', '高的', 'My father is tall.', '我爸爸很高。', '形容词'],
  ['long', '长的', 'The river is long.', '这条河很长。', '形容词'],
  ['happy', '开心的', 'I am happy today.', '我今天很开心。', '形容词'],
  ['sad', '难过的', 'Do not be sad.', '不要难过。', '形容词'],
  ['hot', '热的', 'The tea is hot.', '茶是热的。', '形容词'],
  ['cold', '冷的', 'The water is cold.', '水是冷的。', '形容词'],
  ['new', '新的', 'I have a new bag.', '我有一个新书包。', '形容词'],
  ['old', '旧的', 'This book is old.', '这本书很旧。', '形容词']
]

// ---------- 生成 Excel ----------
function main() {
  const wb = XLSX.utils.book_new()

  // Sheet 1: 单元规划
  const planRows = [['单元ID', '单元标题', '主题色', '关卡数', '内容主题', '状态']]
  UNITS.forEach(([id, title, color, topics]) => {
    planRows.push([id, title, color, 100, topics, id === 'unit-1' ? '已完整（见第一单元词汇表）' : '待补充（复制第一单元词汇表格式填写）'])
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(planRows), '单元规划')

  // Sheet 2: 第一单元词汇（100 行）
  const u1Rows = [['关卡号', '英文', '中文', '例句', '例句中文', '主题']]
  U1.forEach(([en, zh, sent, sentZh, topic], i) => {
    u1Rows.push([i + 1, en, zh, sent, sentZh, topic])
  })
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(u1Rows), '第一单元词汇')

  // Sheet 3: 待补充单元模板说明
  const tplRows = [
    ['【如何补充第 2-8 单元】'],
    ['1. 新建 Sheet，命名为「第X单元词汇」（X 为 2-8）'],
    ['2. 表头与「第一单元词汇」完全一致：关卡号 / 英文 / 中文 / 例句 / 例句中文 / 主题'],
    ['3. 填写 100 行词汇，然后运行 node scripts/build_course.cjs 即可自动生成关卡'],
    ['4. 注意：英文请勿与其他关卡重复（脚本会校验并报错）'],
    [''],
    ['【题目生成规则】每关自动生成 3 道题：'],
    ['① 看英文选中文（4 选 1，干扰项取同单元其他词）'],
    ['② 看中文选英文（4 选 1）'],
    ['③ 例句单词组句（单词库 = 例句单词 + 2 个干扰词）'],
    [''],
    ['【单元配色参考】', 'unit-2 #1CB0F6', 'unit-3 #CE82FF', 'unit-4 #FF9600', 'unit-5 #FFC800', 'unit-6 #FF4B4B', 'unit-7 #2B70C9', 'unit-8 #4CB786']
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(tplRows), '填写说明')

  const outDir = path.join(__dirname, '..', '题库')
  fs.mkdirSync(outDir, { recursive: true })
  const out = path.join(outDir, 'duolingo-题库.xlsx')
  XLSX.writeFile(wb, out)
  console.log('Excel 已生成:', out, `（第一单元 ${U1.length} 关）`)
}

main()
