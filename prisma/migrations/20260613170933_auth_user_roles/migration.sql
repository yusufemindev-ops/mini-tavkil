-- CreateTable
CREATE TABLE "auth_user_roles" (
    "auth_user_id" TEXT NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_user_roles_pkey" PRIMARY KEY ("auth_user_id","role_id")
);

-- CreateIndex
CREATE INDEX "auth_user_roles_user_idx" ON "auth_user_roles"("auth_user_id");

-- AddForeignKey
ALTER TABLE "auth_user_roles" ADD CONSTRAINT "auth_user_roles_auth_user_id_fkey" FOREIGN KEY ("auth_user_id") REFERENCES "authUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_user_roles" ADD CONSTRAINT "auth_user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
