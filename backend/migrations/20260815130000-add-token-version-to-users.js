'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'token_version', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 1
    });

    // Ensure all pre-existing legacy accounts explicitly receive token_version = 1
    await queryInterface.sequelize.query(
      'UPDATE users SET token_version = 1 WHERE token_version IS NULL;'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'token_version');
  }
};
