'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('users', 'is_email_verified', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });

    await queryInterface.addColumn('users', 'verification_token_hash', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'verification_token_expires_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'reset_token_hash', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('users', 'reset_token_expires_at', {
      type: Sequelize.DATE,
      allowNull: true
    });

    // Legacy Users Strategy: Mark pre-existing legacy accounts created prior to Stage 6 as verified
    // so existing administrative and staff accounts remain stable and unblocked.
    await queryInterface.sequelize.query(
      'UPDATE users SET is_email_verified = true;'
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('users', 'reset_token_expires_at');
    await queryInterface.removeColumn('users', 'reset_token_hash');
    await queryInterface.removeColumn('users', 'verification_token_expires_at');
    await queryInterface.removeColumn('users', 'verification_token_hash');
    await queryInterface.removeColumn('users', 'is_email_verified');
  }
};
