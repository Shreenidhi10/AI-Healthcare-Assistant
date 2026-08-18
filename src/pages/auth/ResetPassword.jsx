import AuthLayout from "../../components/auth/AuthLayout";
import ResetPasswordForm from "../../components/auth/ResetPasswordForm";

export default function ResetPassword() {
  return (
    <AuthLayout
      title="Reset Password"
      subtitle="Create a new password for your account"
    >
      <ResetPasswordForm />
    </AuthLayout>
  );
}