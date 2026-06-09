resource "aws_iam_role" "lambda_role" {
  name = "${var.application}-${var.component}-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"

        Principal = {
          Service = "lambda.amazonaws.com"
        }
      }
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.application}-${var.component}-role-${var.environment}"
      component = var.component
    }
  )
}

resource "aws_iam_role_policy_attachment" "basic_execution" {
  role = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy" "ssm_read" {
  name = "${var.application}-${var.component}-ssm-read-${var.environment}"
  role = aws_iam_role.lambda_role.id

  policy = jsonencode({
    Version = "2012-10-17"

    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
        ]
        Resource = "arn:aws:ssm:*:*:parameter/sebcel-chocoop-notifications/${var.environment}/smtp/*"
      }
    ]
  })
}

resource "aws_lambda_function" "notifications" {
  function_name = "${var.application}-${var.component}-function-${var.environment}"
  role = aws_iam_role.lambda_role.arn
  runtime = "nodejs20.x"
  handler = "notifications-handler.handler"
  filename = "${path.root}/../../../build/notifications-handler.zip"
  source_code_hash = filebase64sha256("${path.root}/../../../build/notifications-handler.zip")

  environment {
    variables = {
      ENVIRONMENT             = var.environment
      NOTIFICATION_RECIPIENTS = var.notification_recipients
      SMTP_HOST               = var.smtp_host
      SMTP_PORT               = tostring(var.smtp_port)
      SMTP_FROM               = var.smtp_from
      BASE_URL                = var.base_url
    }
  }

  tags = merge(
    var.common_tags,
    {
      Name = "${var.application}-${var.component}-function-${var.environment}"
      component = var.component
    }
  )
}

resource "aws_cloudwatch_event_rule" "notifications" {
  name = "${var.application}-${var.component}-rule-${var.environment}"
  event_bus_name = var.event_bus_name

  event_pattern = jsonencode({
    source = [
      "sebcel-chocoop"
    ]
  })

  tags = merge(
    var.common_tags,
    {
      Name = "${var.application}-${var.component}-rule-${var.environment}"
      component = var.component
    }
  )
}

resource "aws_cloudwatch_event_target" "lambda_target" {
  rule = aws_cloudwatch_event_rule.notifications.name
  event_bus_name = var.event_bus_name
  target_id = "notifications-lambda"
  arn = aws_lambda_function.notifications.arn
}

resource "aws_lambda_permission" "allow_eventbridge" {
  statement_id = "AllowExecutionFromEventBridge"
  action = "lambda:InvokeFunction"
  function_name = aws_lambda_function.notifications.function_name
  principal = "events.amazonaws.com"
  source_arn = aws_cloudwatch_event_rule.notifications.arn
}

resource "aws_ssm_parameter" "smtp_username" {
  name  = "/sebcel-chocoop-notifications/${var.environment}/smtp/username"
  type  = "SecureString"
  value = "REPLACE_ME"

  tags = merge(
    var.common_tags,
    {
      Name      = "/sebcel-chocoop-notifications/${var.environment}/smtp/username"
      component = var.component
    }
  )

  lifecycle {
    ignore_changes = [value]
  }
}

resource "aws_ssm_parameter" "smtp_password" {
  name  = "/sebcel-chocoop-notifications/${var.environment}/smtp/password"
  type  = "SecureString"
  value = "REPLACE_ME"

  tags = merge(
    var.common_tags,
    {
      Name      = "/sebcel-chocoop-notifications/${var.environment}/smtp/password"
      component = var.component
    }
  )

  lifecycle {
    ignore_changes = [value]
  }
}