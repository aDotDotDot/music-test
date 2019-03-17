'use strict';
module.exports = (sequelize, DataTypes) => {
  const Music_quiz = sequelize.define('Music_quiz', {
    server_id: DataTypes.STRING,
    url: DataTypes.STRING,
    song: DataTypes.STRING,
    singer: DataTypes.STRING
  }, {});
  Music_quiz.associate = function(models) {
    // associations can be defined here
  };
  return Music_quiz;
};
