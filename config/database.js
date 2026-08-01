module.exports = {
  development: {
    username: "root",       // اسم مستخدم قاعدة البيانات لديك
    password: "",           // كلمة المرور (إن وجدت)
    database: "safwa_db",   // اسم قاعدة البيانات التي عثرت عليها
    host: "127.0.0.1",
    dialect: 'mysql'        // يجب أن يكون نصاً هكذا حصراً
  },
  test: {
    username: "root",
    password: "",
    database: "safwa_test",
    host: "127.0.0.1",
    dialect: 'mysql'
  },
  production: {
    username: "root",
    password: "",
    database: "safwa_prod",
    host: "127.0.0.1",
    dialect: 'mysql'
  }
};