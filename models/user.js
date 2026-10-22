const db = require("./database");

module.exports = class user {
  constructor(name, email, password) {
    this.name = name;
    this.email = email;
    this.password = password;
  }

  register = () => {
    return db.execute("insert into users(name,email,password) values(?,?,?)", [
      this.name,
      this.email,
      this.password,
    ]);
  };

  static checkPass = (email) => {
    return db.execute("select password,id from users where email=?", [email]);
  };

  static username = (user_id) => {
    return db.execute("select name from users where id=?", [user_id]);
  };
};
