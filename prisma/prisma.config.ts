export default {
  datasource: {
    db: {
      url:
        process.env.DATABASE_URL ||
        "postgresql://gsekara2@localhost:5432/whatsapp_clone?schema=public",
    },
  },
};
